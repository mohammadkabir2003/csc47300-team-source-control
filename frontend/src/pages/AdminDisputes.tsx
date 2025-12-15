import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { disputeService } from '../services/disputeService'
import { adminService } from '../services/adminService'
import { useAuth } from '../context/AuthContext'
import axios from '../services/axios'
import Header from '../components/Header'
import Modal from '../components/Modal'

export default function AdminDisputes() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [disputes, setDisputes] = useState<any[]>([])
  const [selectedDispute, setSelectedDispute] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveOptions, setResolveOptions] = useState({
    orderStatus: 'waiting_to_meet' as 'waiting_to_meet' | 'met_and_exchanged' | 'cancelled',
    banBuyer: false,
    banSeller: false
  })
  const [modal, setModal] = useState<{
    isOpen: boolean
    title?: string
    message: string
    type?: 'success' | 'error' | 'info' | 'warning'
    onConfirm?: () => void
  }>({
    isOpen: false,
    message: ''
  })

  useEffect(() => {
    if (!user || (user.role !== 'admin1' && user.role !== 'admin2')) {
      navigate('/login')
      return
    }
    loadDisputes()
  }, [user, navigate])

  const loadDisputes = async () => {
    try {
      const params = showDeleted ? { includeDeleted: 'true' } : {}
      const response = await axios.get('/api/admin/disputes', { params })
      setDisputes(response.data.data || [])
    } catch (error) {
      console.error('Error loading disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && (user.role === 'admin1' || user.role === 'admin2')) {
      loadDisputes()
    }
  }, [showDeleted])

  const loadDisputeDetails = async (id: string) => {
    try {
      const dispute = await disputeService.getDispute(id)
      setSelectedDispute(dispute)
    } catch (error) {
      console.error('Error loading dispute:', error)
    }
  }

  // Check if another active (non-deleted) dispute exists for the same order
  const hasAnotherActiveDisputeForOrder = (dispute: any) => {
    if (!dispute?.orderId?._id) return false
    return disputes.some(
      d => d.orderId?._id === dispute.orderId._id && 
           d._id !== dispute._id && 
           !d.isDeleted
    )
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDispute || !message.trim()) return

    try {
      await disputeService.addMessage(selectedDispute._id, message)
      setMessage('')
      loadDisputeDetails(selectedDispute._id)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleOpenResolveModal = () => {
    if (!resolution.trim()) {
      setModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please enter a resolution',
        type: 'warning'
      })
      return
    }
    setShowResolveModal(true)
  }

  const handleResolve = async () => {
    if (!selectedDispute) return

    // Debug logging
    console.log('Resolving dispute with options:', resolveOptions)
    console.log('Selected dispute:', selectedDispute)
    console.log('Buyer ID:', selectedDispute.buyerId?._id)
    console.log('Seller ID:', selectedDispute.sellerId?._id)

    try {
      // First resolve the dispute
      await disputeService.resolveDispute(selectedDispute._id, resolution)
      
      // Update order status if needed
      if (selectedDispute.orderId?._id) {
        await axios.put(`/api/admin/orders/${selectedDispute.orderId._id}`, {
          status: resolveOptions.orderStatus
        })
      }
      
      // Ban users if selected (using proper adminService)
      const banReason = `Banned due to dispute resolution on Order #${selectedDispute.orderId?.orderNumber || selectedDispute.orderId?._id || 'unknown'}`
      
      const banResults: string[] = []
      
      console.log('Ban buyer?', resolveOptions.banBuyer, 'Buyer ID:', selectedDispute.buyerId?._id)
      console.log('Ban seller?', resolveOptions.banSeller, 'Seller ID:', selectedDispute.sellerId?._id)
      
      if (resolveOptions.banBuyer && selectedDispute.buyerId?._id) {
        try {
          console.log('Attempting to ban buyer:', selectedDispute.buyerId._id)
          await adminService.banUser(selectedDispute.buyerId._id, banReason)
          banResults.push(`Buyer ${selectedDispute.buyerId.firstName} banned`)
        } catch (banError: any) {
          console.error('Error banning buyer:', banError)
          banResults.push(`Failed to ban buyer: ${banError.response?.data?.message || banError.message}`)
        }
      }
      
      if (resolveOptions.banSeller && selectedDispute.sellerId?._id) {
        try {
          console.log('Attempting to ban seller:', selectedDispute.sellerId._id)
          await adminService.banUser(selectedDispute.sellerId._id, banReason)
          banResults.push(`Seller ${selectedDispute.sellerId.firstName} banned`)
        } catch (banError: any) {
          console.error('Error banning seller:', banError)
          banResults.push(`Failed to ban seller: ${banError.response?.data?.message || banError.message}`)
        }
      }

      setShowResolveModal(false)
      
      const successMessage = banResults.length > 0 
        ? `Dispute resolved successfully. ${banResults.join('. ')}`
        : 'Dispute resolved successfully'
      
      setModal({
        isOpen: true,
        title: 'Success',
        message: successMessage,
        type: 'success'
      })
      setSelectedDispute(null)
      setResolution('')
      setResolveOptions({
        orderStatus: 'waiting_to_meet',
        banBuyer: false,
        banSeller: false
      })
      loadDisputes()
    } catch (error: any) {
      console.error('Error resolving dispute:', error)
      setShowResolveModal(false)
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Error resolving dispute',
        type: 'error'
      })
    }
  }

  const handleClose = async () => {
    if (!selectedDispute) return

    setModal({
      isOpen: true,
      title: 'Confirm Close',
      message: 'Are you sure you want to close this dispute?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await disputeService.closeDispute(selectedDispute._id)
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'Dispute closed successfully',
            type: 'success'
          })
          setSelectedDispute(null)
          loadDisputes()
        } catch (error) {
          console.error('Error closing dispute:', error)
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'Error closing dispute',
            type: 'error'
          })
        }
      }
    })
  }

  const handleDelete = async () => {
    if (!selectedDispute) return

    setModal({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this dispute? This can be restored later.',
      type: 'warning',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/admin/disputes/${selectedDispute._id}`)
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'Dispute deleted successfully',
            type: 'success'
          })
          setSelectedDispute(null)
          loadDisputes()
        } catch (error: any) {
          console.error('Error deleting dispute:', error)
          setModal({
            isOpen: true,
            title: 'Error',
            message: error.response?.data?.message || 'Error deleting dispute',
            type: 'error'
          })
        }
      }
    })
  }

  const handleRestore = async () => {
    if (!selectedDispute) return

    setModal({
      isOpen: true,
      title: 'Confirm Restore',
      message: 'Are you sure you want to restore this dispute?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await axios.post(`/api/admin/disputes/${selectedDispute._id}/restore`)
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'Dispute restored successfully',
            type: 'success'
          })
          setSelectedDispute(null)
          loadDisputes()
        } catch (error: any) {
          console.error('Error restoring dispute:', error)
          setModal({
            isOpen: true,
            title: 'Error',
            message: error.response?.data?.message || 'Error restoring dispute',
            type: 'error'
          })
        }
      }
    })
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open':
        return { backgroundColor: 'var(--color-error)', color: 'white' }
      case 'under_review':
        return { backgroundColor: 'var(--color-secondary)', color: 'white' }
      case 'resolved':
        return { backgroundColor: 'var(--color-success)', color: 'white' }
      default:
        return { backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }
    }
  }

  const getMessageStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return { backgroundColor: 'rgba(91, 33, 182, 0.1)' } // primary color with opacity
      case 'buyer':
        return { backgroundColor: 'rgba(34, 197, 94, 0.1)' } // success color with opacity
      default:
        return { backgroundColor: 'rgba(245, 158, 11, 0.1)' } // secondary color with opacity
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container">
          <p className="muted">Loading disputes...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="page-header">
          <h1>Dispute Management</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {user?.role === 'admin2' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                />
                <span>Show Deleted</span>
              </label>
            )}
            <Link to="/admin" className="btn btn-ghost">← Back to Dashboard</Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {/* Disputes List */}
          <div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>Disputes ({disputes.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {disputes.length === 0 ? (
                <p className="muted">No disputes found</p>
              ) : (
                disputes.map((dispute) => (
                  <div
                    key={dispute._id}
                    onClick={() => loadDisputeDetails(dispute._id)}
                    className="card"
                    style={{ 
                      cursor: 'pointer',
                      border: selectedDispute?._id === dispute._id ? '2px solid var(--color-primary)' : 
                              dispute.orderDeleted ? '2px solid #dc2626' :
                              dispute.isDeleted ? '2px solid #9ca3af' : undefined,
                      backgroundColor: selectedDispute?._id === dispute._id ? 'rgba(91, 33, 182, 0.05)' : 
                                       dispute.orderDeleted ? '#fef2f2' :
                                       dispute.isDeleted ? '#f9fafb' : undefined,
                      opacity: dispute.isDeleted ? 0.7 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>
                          Dispute #{dispute._id.substring(0, 8)}
                          {dispute.isDeleted && (
                            <span style={{
                              marginLeft: '0.5rem',
                              background: '#6b7280',
                              color: 'white',
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              DELETED
                            </span>
                          )}
                          {dispute.orderDeleted && (
                            <span style={{
                              marginLeft: '0.5rem',
                              background: '#dc2626',
                              color: 'white',
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              ORDER DELETED
                            </span>
                          )}
                        </p>
                        <p className="muted" style={{ fontSize: '0.875rem' }}>
                          Order: {dispute.orderId?.orderNumber || 'N/A'}
                        </p>
                      </div>
                      <span style={{
                        ...getStatusStyle(dispute.status),
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {dispute.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <strong>Buyer:</strong> {dispute.buyerId?.firstName} {dispute.buyerId?.lastName}
                    </p>
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <strong>Seller:</strong> {dispute.sellerId?.firstName} {dispute.sellerId?.lastName}
                    </p>
                    <p className="muted" style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dispute.reason}
                    </p>
                    <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dispute Details */}
          <div>
            {selectedDispute ? (
              <div className="card">
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>Dispute Details</h2>
                
                {selectedDispute.orderDeleted && (
                  <div style={{ 
                    marginBottom: '1rem', 
                    padding: '1rem', 
                    background: '#fef2f2', 
                    borderRadius: 'var(--radius)',
                    border: '2px solid #dc2626'
                  }}>
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: 'bold' }}>
                      ⚠️ ORDER DELETED: This dispute is on a deleted order. No actions (messages, resolve, close) can be taken. This dispute remains for record purposes only.
                    </p>
                  </div>
                )}

                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-surface)', 
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)'
                }}>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>Status:</strong> {selectedDispute.status}
                  </p>
                  <p style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>Order:</strong> {selectedDispute.orderId?.orderNumber || 'N/A'}
                    {selectedDispute.orderId?._id && (
                      <Link
                        to={`/admin/orders?highlight=${selectedDispute.orderId._id}`}
                        className="btn"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Order
                      </Link>
                    )}
                    {selectedDispute.orderId?.status && (
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        background: selectedDispute.orderId.status === 'met_and_exchanged' ? '#d1fae5' :
                                   selectedDispute.orderId.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                        color: selectedDispute.orderId.status === 'met_and_exchanged' ? '#065f46' :
                               selectedDispute.orderId.status === 'cancelled' ? '#991b1b' : '#92400e',
                        textTransform: 'capitalize'
                      }}>
                        {selectedDispute.orderId.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </p>
                  <p style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>Buyer:</strong> {selectedDispute.buyerId?.firstName} {selectedDispute.buyerId?.lastName} ({selectedDispute.buyerId?.email})
                    {selectedDispute.buyerId?.isBanned && (
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        background: '#dc2626',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>BANNED</span>
                    )}
                    {selectedDispute.buyerId?.isDeleted && (
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        background: '#6b7280',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>DELETED</span>
                    )}
                  </p>
                  <p style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>Seller:</strong> {selectedDispute.sellerId?.firstName} {selectedDispute.sellerId?.lastName} ({selectedDispute.sellerId?.email})
                    {selectedDispute.sellerId?.isBanned && (
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        background: '#dc2626',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>BANNED</span>
                    )}
                    {selectedDispute.sellerId?.isDeleted && (
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        background: '#6b7280',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>DELETED</span>
                    )}
                  </p>
                  <p>
                    <strong>Reason:</strong> {selectedDispute.reason}
                  </p>
                </div>

                {/* Messages */}
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Communication</h3>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedDispute.messages?.map((msg: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          ...getMessageStyle(msg.senderRole),
                          padding: '0.75rem',
                          borderRadius: 'var(--radius)'
                        }}
                      >
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          {msg.senderRole === 'admin' ? 'Admin' : msg.senderRole === 'buyer' ? 'Buyer' : 'Seller'}
                          <span className="muted" style={{ fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: 400 }}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </p>
                        <p style={{ fontSize: '0.875rem' }}>{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Message */}
                {!selectedDispute.orderDeleted && selectedDispute.status !== 'closed' && selectedDispute.status !== 'resolved' && (
                  <form onSubmit={handleSendMessage} style={{ marginBottom: '1rem' }}>
                    <div className="form-group">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="textarea"
                        rows={3}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary">
                      Send Message
                    </button>
                  </form>
                )}

                {/* Resolution */}
                {!selectedDispute.orderDeleted && selectedDispute.status !== 'closed' && selectedDispute.status !== 'resolved' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Resolve Dispute</h3>
                    <div className="form-group">
                      <textarea
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        placeholder="Enter resolution details..."
                        className="textarea"
                        rows={3}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={handleOpenResolveModal}
                        className="btn"
                        style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
                      >
                        Resolve
                      </button>
                      <button
                        onClick={handleClose}
                        className="btn btn-ghost"
                      >
                        Close Without Resolution
                      </button>
                    </div>
                  </div>
                )}

                {selectedDispute.resolution && (
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                    borderRadius: 'var(--radius)' 
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Resolution:</p>
                    <p>{selectedDispute.resolution}</p>
                    <p className="muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Resolved on {new Date(selectedDispute.resolvedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Admin2 Delete/Restore Actions */}
                {user?.role === 'admin2' && (
                  <div style={{ 
                    marginTop: '1.5rem', 
                    paddingTop: '1rem', 
                    borderTop: '1px solid var(--color-border)'
                  }}>
                    {selectedDispute.isDeleted ? (
                      <div>
                        {hasAnotherActiveDisputeForOrder(selectedDispute) && (
                          <div style={{ 
                            padding: '0.75rem', 
                            background: '#fef2f2', 
                            border: '1px solid #fecaca', 
                            borderRadius: '8px', 
                            marginBottom: '0.75rem' 
                          }}>
                            <p style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                              ⚠️ Cannot restore - another active dispute exists for this order
                            </p>
                          </div>
                        )}
                        <button
                          onClick={handleRestore}
                          className="btn"
                          style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
                          disabled={hasAnotherActiveDisputeForOrder(selectedDispute)}
                        >
                          Restore Dispute
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleDelete}
                        className="btn"
                        style={{ backgroundColor: '#dc2626', color: 'white' }}
                      >
                        Delete Dispute
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p className="muted">Select a dispute to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Resolve Dispute</h2>
            
            {/* Order Status */}
            <div className="form-group">
              <label htmlFor="orderStatus" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                Set Order Status
              </label>
              <select
                id="orderStatus"
                value={resolveOptions.orderStatus}
                onChange={(e) => setResolveOptions({ ...resolveOptions, orderStatus: e.target.value as any })}
                className="input"
              >
                <option value="waiting_to_meet">Waiting to Meet</option>
                <option value="met_and_exchanged">Met and Exchanged</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Choose the final status for this order
              </p>
            </div>

            {/* Ban Options */}
            <div style={{ 
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>
                User Actions
              </h3>
              
              {/* Ban Buyer */}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                cursor: 'pointer',
                marginBottom: '0.75rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                background: resolveOptions.banBuyer ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
              }}>
                <input
                  type="checkbox"
                  checked={resolveOptions.banBuyer}
                  onChange={(e) => setResolveOptions({ ...resolveOptions, banBuyer: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    Ban Buyer: {selectedDispute?.buyerId?.firstName} {selectedDispute?.buyerId?.lastName}
                  </p>
                  <p className="muted" style={{ fontSize: '0.75rem' }}>
                    {selectedDispute?.buyerId?.email}
                  </p>
                </div>
              </label>

              {/* Ban Seller */}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                background: resolveOptions.banSeller ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
              }}>
                <input
                  type="checkbox"
                  checked={resolveOptions.banSeller}
                  onChange={(e) => setResolveOptions({ ...resolveOptions, banSeller: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    Ban Seller: {selectedDispute?.sellerId?.firstName} {selectedDispute?.sellerId?.lastName}
                  </p>
                  <p className="muted" style={{ fontSize: '0.75rem' }}>
                    {selectedDispute?.sellerId?.email}
                  </p>
                </div>
              </label>
            </div>

            {/* Warning */}
            {(resolveOptions.banBuyer || resolveOptions.banSeller) && (
              <div style={{ 
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid var(--color-secondary)',
                borderRadius: 'var(--radius)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', margin: 0 }}>
                  ⚠️ <strong>Warning:</strong> Banned users will not be able to log in or access the platform.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={handleResolve}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Confirm & Resolve
              </button>
              <button
                onClick={() => setShowResolveModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(m => ({ ...m, isOpen: false, onConfirm: undefined }))}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.onConfirm ? 'Yes, Close' : 'OK'}
        cancelText="Cancel"
      />
    </>
  )
}
