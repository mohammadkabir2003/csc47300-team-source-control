import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { disputeService } from '../services/disputeService'

interface Message {
  _id?: string
  senderId: {
    _id: string
    firstName: string
    lastName: string
  }
  senderRole: 'buyer' | 'seller' | 'admin'
  message: string
  createdAt: string
}

interface Dispute {
  _id: string
  orderId: {
    _id: string
    orderNumber: string
    totalAmount: number
  }
  buyerId: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  sellerId: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  reason: string
  status: 'open' | 'under_review' | 'resolved' | 'closed'
  messages: Message[]
  resolution?: string
  orderDeleted?: boolean
  createdAt: string
}

export default function DisputeChat() {
  const { id } = useParams<{ id: string }>()
  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [modal, setModal] = useState<{
    isOpen: boolean
    title?: string
    message: string
    type?: 'success' | 'error' | 'info' | 'warning'
  }>({
    isOpen: false,
    message: ''
  })

  useEffect(() => {
    loadDispute()
    const interval = setInterval(loadDispute, 5000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [dispute?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadDispute = async () => {
    if (!id) return
    
    try {
      const data = await disputeService.getDispute(id)
      setDispute(data)
    } catch (error) {
      console.error('Failed to load dispute:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !id) return

    
    if (dispute?.orderDeleted) {
      setModal({
        isOpen: true,
        title: 'Order Deleted',
        message: 'This dispute is on a deleted order. No actions can be taken.',
        type: 'error'
      })
      return
    }

    
    if (dispute?.status === 'resolved' || dispute?.status === 'closed') {
      setModal({
        isOpen: true,
        title: 'Chat Locked',
        message: 'This dispute has been ' + dispute.status + '. No more messages can be sent.',
        type: 'warning'
      })
      return
    }

    setSending(true)
    try {
      await disputeService.addMessage(id, newMessage)
      setNewMessage('')
      await loadDispute()
    } catch (error: any) {
      setModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to send message',
        type: 'error'
      })
    } finally {
      setSending(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#dc2626'
      case 'buyer':
        return '#2563eb'
      case 'seller':
        return '#16a34a'
      default:
        return '#6b7280'
    }
  }

  const getRoleBadge = (role: string) => {
    return (
      <span style={{
        fontSize: '0.75rem',
        padding: '0.125rem 0.5rem',
        borderRadius: '9999px',
        background: getRoleColor(role),
        color: 'white',
        fontWeight: 'bold',
        textTransform: 'uppercase',
      }}>
        {role}
      </span>
    )
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="container">
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>
        </main>
      </>
    )
  }

  if (!dispute) {
    return (
      <>
        <Header />
        <main className="container">
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p className="muted">Dispute not found</p>
            <a href="/orders" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Back to Orders
            </a>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      
      <main id="main" className="container" style={{ maxWidth: '900px' }}>
        <header className="page-header">
          <h1>Dispute Chat</h1>
          <a href="/orders" className="btn btn-secondary">Back to Orders</a>
        </header>

        
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3>Order #{dispute.orderId.orderNumber}</h3>
              <p className="muted">
                Amount: ${dispute.orderId.totalAmount || '0.00'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ 
                textTransform: 'capitalize', 
                fontWeight: 'bold',
                color: dispute.status === 'resolved' ? '#16a34a' : '#f59e0b'
              }}>
                {dispute.status.replace(/_/g, ' ')}
              </p>
              <p className="muted">{new Date(dispute.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div style={{ 
            padding: '1rem', 
            background: 'var(--color-bg-secondary)', 
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p><strong>Dispute Reason:</strong></p>
            <p>{dispute.reason}</p>
          </div>

          {dispute.orderDeleted && (
            <div style={{ 
              padding: '1rem', 
              background: '#fef2f2', 
              borderRadius: '8px',
              border: '2px solid #dc2626',
              marginBottom: '1rem'
            }}>
              <p style={{ margin: 0, color: '#991b1b', fontWeight: 'bold' }}>
                ⚠️ ORDER DELETED: This dispute is on a deleted order. No actions can be taken. This dispute remains for record purposes only.
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p className="muted">Buyer</p>
              <p><strong>{dispute.buyerId.firstName} {dispute.buyerId.lastName}</strong></p>
              <p className="muted" style={{ fontSize: '0.875rem' }}>{dispute.buyerId.email}</p>
            </div>
            <div>
              <p className="muted">Seller</p>
              <p><strong>{dispute.sellerId.firstName} {dispute.sellerId.lastName}</strong></p>
              <p className="muted" style={{ fontSize: '0.875rem' }}>{dispute.sellerId.email}</p>
            </div>
          </div>

          {dispute.resolution && (
            <div style={{ 
              marginTop: '1rem',
              padding: '1rem', 
              background: '#dcfce7', 
              borderRadius: '8px',
              border: '1px solid #16a34a'
            }}>
              <p><strong>Resolution:</strong></p>
              <p>{dispute.resolution}</p>
            </div>
          )}
        </div>

        
        <div className="card" style={{ 
          height: '500px', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0
        }}>
          <div style={{ 
            padding: '1rem', 
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)'
          }}>
            <h3 style={{ margin: 0 }}>Messages</h3>
          </div>

          
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {dispute.messages.map((msg, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong>{msg.senderId.firstName} {msg.senderId.lastName}</strong>
                  {getRoleBadge(msg.senderRole)}
                  <span className="muted" style={{ fontSize: '0.75rem' }}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{
                  padding: '0.75rem',
                  background: msg.senderRole === 'admin' ? '#fef2f2' : 'var(--color-bg-secondary)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${getRoleColor(msg.senderRole)}`
                }}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          
          <form onSubmit={handleSendMessage} style={{ 
            padding: '1rem', 
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={dispute.orderDeleted ? "Order deleted - chat locked" : "Type your message..."}
                disabled={sending || dispute.status === 'resolved' || dispute.status === 'closed' || dispute.orderDeleted}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                }}
              />
              <button 
                type="submit"
                disabled={sending || !newMessage.trim() || dispute.status === 'resolved' || dispute.status === 'closed' || dispute.orderDeleted}
                className="btn btn-primary"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
            {dispute.orderDeleted && (
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#dc2626', fontWeight: 'bold' }}>
                ⚠️ Order has been deleted. This dispute is locked and no actions can be taken.
              </p>
            )}
            {!dispute.orderDeleted && (dispute.status === 'resolved' || dispute.status === 'closed') && (
              <p className="muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                This dispute has been {dispute.status}. Chat is now locked.
              </p>
            )}
          </form>
        </div>

        <Modal
          isOpen={modal.isOpen}
          onClose={() => setModal({ ...modal, isOpen: false })}
          title={modal.title}
          message={modal.message}
          type={modal.type}
        />
      </main>
    </>
  )
}
