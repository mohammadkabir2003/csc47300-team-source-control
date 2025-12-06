import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { DBOrder } from '../types'
import { orderService } from '../services/orderService'

type OrderTab = 'purchases' | 'sales'

export default function Orders() {
  const [activeTab, setActiveTab] = useState<OrderTab>('purchases')
  const [orders, setOrders] = useState<DBOrder[]>([])
  const [sellerOrders, setSellerOrders] = useState<DBOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [disputeModal, setDisputeModal] = useState<{ show: boolean; orderId: string; orderNumber: string }>({ 
    show: false, 
    orderId: '', 
    orderNumber: '' 
  })
  const [disputeReason, setDisputeReason] = useState('')
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
    loadOrders()
  }, [activeTab])

  const loadOrders = async () => {
    setLoading(true)
    try {
      if (activeTab === 'purchases') {
        const data = await orderService.getOrders()
        setOrders(data)
      } else {
        const data = await orderService.getSellerOrders()
        setSellerOrders(data)
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus)
      await loadOrders()
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'Order status updated successfully',
        type: 'success'
      })
    } catch (error: any) {
      setModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update order status',
        type: 'error'
      })
    }
  }

  const handleOpenDispute = (orderId: string, orderNumber: string) => {
    setDisputeModal({ show: true, orderId, orderNumber })
    setDisputeReason('')
  }

  const handleSubmitDispute = async () => {
    if (!disputeReason.trim()) {
      setModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please provide a reason for the dispute',
        type: 'warning'
      })
      return
    }

    try {
      await orderService.createDispute(disputeModal.orderId, disputeReason)
      setDisputeModal({ show: false, orderId: '', orderNumber: '' })
      setDisputeReason('')
      await loadOrders()
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'Dispute created successfully',
        type: 'success'
      })
    } catch (error: any) {
      setModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create dispute',
        type: 'error'
      })
    }
  }

  const handleConfirm = async (orderId: string, type: 'buyer' | 'seller') => {
    try {
      if (type === 'buyer') {
        await orderService.buyerConfirm(orderId)
      } else {
        await orderService.sellerConfirm(orderId)
      }
      await loadOrders() // Wait for orders to reload
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'Order confirmed successfully',
        type: 'success'
      })
    } catch (error: any) {
      setModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to confirm order',
        type: 'error'
      })
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Cancellation',
      message: 'Are you sure you want to cancel this order?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await orderService.cancelOrder(orderId)
          await loadOrders()
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'Order cancelled successfully',
            type: 'success'
          })
        } catch (error: any) {
          setModal({
            isOpen: true,
            title: 'Error',
            message: error.response?.data?.message || 'Failed to cancel order',
            type: 'error'
          })
        }
      }
    })
  }

  return (
    <>
      <Header />
      
      <main id="main" className="container">
        <header className="page-header">
          <h1>My Orders</h1>
        </header>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('purchases')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'purchases' ? '3px solid var(--color-primary)' : 'none',
              color: activeTab === 'purchases' ? 'var(--color-primary)' : 'inherit',
              fontWeight: activeTab === 'purchases' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            My Purchases
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'sales' ? '3px solid var(--color-primary)' : 'none',
              color: activeTab === 'sales' ? 'var(--color-primary)' : 'inherit',
              fontWeight: activeTab === 'sales' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            My Sales
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>
        ) : (
          <>
            {activeTab === 'purchases' ? (
              orders.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <p className="muted">No purchases yet</p>
                  <a href="/market" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Start Shopping
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: '2rem' }}>
                  {orders.map(order => {
                    const orderId = order._id || order.id
                    const orderNumber = order.orderNumber || orderId
                    const total = order.totalAmount || '0.00'
                    const date = new Date(order.createdAt || order.created_at || Date.now()).toLocaleDateString()

                    return (
                      <div key={orderId} className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div>
                            <h3>Order #{orderNumber}</h3>
                            <p className="muted">{date}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p className="price">${total}</p>
                            <div>
                              <p className="muted" style={{ textTransform: 'capitalize' }}>
                                {order.status.replace(/_/g, ' ')}
                              </p>
                              {order.disputeId && (
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#f59e0b', 
                                  fontWeight: 'bold',
                                  display: 'block'
                                }}>
                                  DISPUTED
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ marginBottom: '1rem' }}>
                          {order.items?.map((item: any, index: number) => {
                            const imageUrl = item.image 
                              ? `/api/uploads/image/${item.image}`
                              : item.productId?.images?.[0]
                                ? `/api/uploads/image/${item.productId.images[0]}`
                                : null
                            const sellerInactive = item.sellerBanned || item.sellerDeleted
                            return (
                              <div key={index} style={{ padding: '0.75rem 0', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={item.name || 'Product'}
                                    style={{ 
                                      width: '60px', 
                                      height: '60px', 
                                      objectFit: 'cover', 
                                      borderRadius: 'var(--radius)',
                                      flexShrink: 0,
                                      opacity: sellerInactive ? 0.5 : 1
                                    }}
                                  />
                                ) : (
                                  <div style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    background: 'var(--color-surface)', 
                                    borderRadius: 'var(--radius)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    opacity: sellerInactive ? 0.5 : 1
                                  }}>
                                    <span className="muted" style={{ fontSize: '0.625rem' }}>No img</span>
                                  </div>
                                )}
                                <div style={{ flex: 1 }}>
                                  <p><strong>{item.name || item.productId?.name || 'Product'}</strong></p>
                                  <p className="muted">Quantity: {item.quantity} × ${item.price || item.productId?.price || '0.00'}</p>
                                  {sellerInactive && (
                                    <p style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#dc2626', 
                                      fontWeight: 'bold',
                                      marginTop: '0.25rem'
                                    }}>
                                      ⚠️ Seller account {item.sellerBanned ? 'banned' : 'deleted'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Check if any seller is banned/deleted */}
                        {(() => {
                          const hasInactiveSeller = order.items?.some((item: any) => item.sellerBanned || item.sellerDeleted)
                          
                          if (hasInactiveSeller) {
                            return (
                              <div style={{ 
                                background: '#fef2f2', 
                                border: '1px solid #fecaca',
                                padding: '1rem',
                                borderRadius: 'var(--radius)',
                                marginBottom: '1rem'
                              }}>
                                <p style={{ margin: 0, color: '#991b1b', fontSize: '0.875rem' }}>
                                  <strong>⚠️ Seller Account Inactive:</strong> This seller's account is no longer active. 
                                  You cannot edit this order, but you can open a dispute to resolve any issues.
                                </p>
                              </div>
                            )
                          }
                          return null
                        })()}

                        {/* Buyer Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {(() => {
                            const hasInactiveSeller = order.items?.some((item: any) => item.sellerBanned || item.sellerDeleted)
                            
                            if (hasInactiveSeller) {
                              // Only allow disputes for orders with banned/deleted sellers
                              return (
                                <>
                                  {!order.disputeId ? (
                                    <button 
                                      onClick={() => handleOpenDispute(orderId!, orderNumber!)}
                                      className="btn"
                                      style={{ fontSize: '0.875rem', background: '#f59e0b', color: 'white' }}
                                    >
                                      Open Dispute
                                    </button>
                                  ) : (
                                    <a 
                                      href={`/disputes/${typeof order.disputeId === 'object' ? (order.disputeId as any)?._id : order.disputeId}`}
                                      className="btn"
                                      style={{ fontSize: '0.875rem', background: '#10b981', color: 'white' }}
                                    >
                                      View Dispute Chat
                                    </a>
                                  )}
                                </>
                              )
                            }
                            
                            // Normal actions for active sellers
                            return (
                              <>
                                {order.status === 'waiting_to_meet' && !order.disputeId && (
                                  <button 
                                    onClick={() => handleCancelOrder(orderId!)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.875rem' }}
                                  >
                                    Cancel Order
                                  </button>
                                )}
                                
                                {order.status === 'waiting_to_meet' && order.buyerConfirmed !== true && !order.disputeId && (
                                  <button 
                                    onClick={() => handleConfirm(orderId!, 'buyer')}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.875rem' }}
                                  >
                                    Confirm Meetup
                                  </button>
                                )}
                                
                                {order.status === 'waiting_to_meet' && order.buyerConfirmed === true && order.sellerConfirmed !== true && !order.disputeId && (
                                  <p className="muted" style={{ fontSize: '0.875rem', margin: '0.5rem 0' }}>
                                    ✓ You confirmed - waiting for seller
                                  </p>
                                )}
                                
                                {order.disputeId && (
                                  <p className="muted" style={{ fontSize: '0.875rem', margin: '0.5rem 0', color: '#f59e0b', fontWeight: '600' }}>
                                    ⚠️ Order actions frozen due to active dispute
                                  </p>
                                )}

                                {!order.disputeId ? (
                                  <button 
                                    onClick={() => handleOpenDispute(orderId!, orderNumber!)}
                                    className="btn"
                                    style={{ fontSize: '0.875rem', background: '#f59e0b', color: 'white' }}
                                  >
                                    Open Dispute
                                  </button>
                                ) : (
                                  <a 
                                    href={`/disputes/${typeof order.disputeId === 'object' ? (order.disputeId as any)?._id : order.disputeId}`}
                                    className="btn"
                                    style={{ fontSize: '0.875rem', background: '#10b981', color: 'white' }}
                                  >
                                    View Dispute Chat
                                  </a>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              // Sales Tab
              sellerOrders.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <p className="muted">No sales yet</p>
                  <a href="/sell" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    List an Item
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: '2rem' }}>
                  {sellerOrders.map(order => {
                    const orderId = order._id || order.id
                    const orderNumber = order.orderNumber || orderId
                    const total = order.totalAmount || '0.00'
                    const date = new Date(order.createdAt || order.created_at || Date.now()).toLocaleDateString()

                    return (
                      <div key={orderId} className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div>
                            <h3>Sale #{orderNumber}</h3>
                            <p className="muted">{date}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p className="price">${total}</p>
                            <div>
                              {/* Only allow status change if order is still in waiting_to_meet AND no active dispute */}
                              {order.status === 'waiting_to_meet' && !order.disputeId ? (
                                <select
                                  value={order.status}
                                  onChange={(e) => handleStatusChange(orderId!, e.target.value)}
                                  style={{ 
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid var(--color-border)',
                                    textTransform: 'capitalize'
                                  }}
                                >
                                  <option value="waiting_to_meet">Waiting to Meet</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              ) : (
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '4px',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  background: order.status === 'met_and_exchanged' ? '#d1fae5' : 
                                             order.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                                  color: order.status === 'met_and_exchanged' ? '#065f46' : 
                                         order.status === 'cancelled' ? '#991b1b' : '#92400e',
                                  textTransform: 'capitalize'
                                }}>
                                  {order.status.replace(/_/g, ' ')}
                                </span>
                              )}
                              {order.disputeId && (
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#f59e0b', 
                                  fontWeight: 'bold',
                                  display: 'block',
                                  marginTop: '0.25rem'
                                }}>
                                  DISPUTED
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ marginBottom: '1rem' }}>
                          {order.items?.map((item: any, index: number) => {
                            const imageUrl = item.image 
                              ? `/api/uploads/image/${item.image}`
                              : item.productId?.images?.[0]
                                ? `/api/uploads/image/${item.productId.images[0]}`
                                : null
                            return (
                              <div key={index} style={{ padding: '0.75rem 0', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={item.name || 'Product'}
                                    style={{ 
                                      width: '60px', 
                                      height: '60px', 
                                      objectFit: 'cover', 
                                      borderRadius: 'var(--radius)',
                                      flexShrink: 0
                                    }}
                                  />
                                ) : (
                                  <div style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    background: 'var(--color-surface)', 
                                    borderRadius: 'var(--radius)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <span className="muted" style={{ fontSize: '0.625rem' }}>No img</span>
                                  </div>
                                )}
                                <div>
                                  <p><strong>{item.name || item.productId?.name || 'Product'}</strong></p>
                                  <p className="muted">Quantity: {item.quantity} × ${item.price || item.productId?.price || '0.00'}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Check if buyer is banned/deleted */}
                        {(order.buyerBanned || order.buyerDeleted) && (
                          <div style={{ 
                            background: '#fef2f2', 
                            border: '1px solid #fecaca',
                            padding: '1rem',
                            borderRadius: 'var(--radius)',
                            marginBottom: '1rem'
                          }}>
                            <p style={{ margin: 0, color: '#991b1b', fontSize: '0.875rem' }}>
                              <strong>⚠️ Buyer Account Inactive:</strong> The buyer's account is no longer active. 
                              You cannot edit this order, but you can open a dispute to resolve any issues.
                            </p>
                          </div>
                        )}

                        {/* Seller Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {(() => {
                            const buyerInactive = order.buyerBanned || order.buyerDeleted
                            
                            if (buyerInactive) {
                              // Only allow disputes for orders with banned/deleted buyers
                              return (
                                <>
                                  {!order.disputeId ? (
                                    <button 
                                      onClick={() => handleOpenDispute(orderId!, orderNumber!)}
                                      className="btn"
                                      style={{ fontSize: '0.875rem', background: '#f59e0b', color: 'white' }}
                                    >
                                      Open Dispute
                                    </button>
                                  ) : (
                                    <a 
                                      href={`/disputes/${typeof order.disputeId === 'object' ? (order.disputeId as any)?._id : order.disputeId}`}
                                      className="btn"
                                      style={{ fontSize: '0.875rem', background: '#10b981', color: 'white' }}
                                    >
                                      View Dispute Chat
                                    </a>
                                  )}
                                </>
                              )
                            }
                            
                            // Normal actions for active buyers
                            return (
                              <>
                                {order.status === 'waiting_to_meet' && order.sellerConfirmed !== true && !order.disputeId && (
                                  <button 
                                    onClick={() => handleConfirm(orderId!, 'seller')}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.875rem' }}
                                  >
                                    Confirm Meetup
                                  </button>
                                )}
                                
                                {order.status === 'waiting_to_meet' && order.sellerConfirmed === true && order.buyerConfirmed !== true && !order.disputeId && (
                                  <p className="muted" style={{ fontSize: '0.875rem', margin: '0.5rem 0' }}>
                                    ✓ You confirmed - waiting for buyer
                                  </p>
                                )}
                                
                                {order.disputeId && (
                                  <p className="muted" style={{ fontSize: '0.875rem', margin: '0.5rem 0', color: '#f59e0b', fontWeight: '600' }}>
                                    ⚠️ Order actions frozen due to active dispute
                                  </p>
                                )}

                                {!order.disputeId ? (
                                  <button 
                                    onClick={() => handleOpenDispute(orderId!, orderNumber!)}
                                    className="btn"
                                    style={{ fontSize: '0.875rem', background: '#f59e0b', color: 'white' }}
                                  >
                                    Open Dispute
                                  </button>
                                ) : (
                                  <a 
                                    href={`/disputes/${typeof order.disputeId === 'object' ? (order.disputeId as any)?._id : order.disputeId}`}
                                    className="btn"
                                    style={{ fontSize: '0.875rem', background: '#10b981', color: 'white' }}
                                  >
                                    View Dispute Chat
                                  </a>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </>
        )}

        {/* Dispute Modal */}
        {disputeModal.show && (
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
            <div className="card" style={{ maxWidth: '500px', width: '90%' }}>
              <h2>Open Dispute for Order #{disputeModal.orderNumber}</h2>
              <p className="muted" style={{ marginBottom: '1rem' }}>
                Describe the issue with this order. An admin will review your dispute.
              </p>
              
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontFamily: 'inherit',
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setDisputeModal({ show: false, orderId: '', orderNumber: '' })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitDispute}
                  className="btn btn-primary"
                >
                  Submit Dispute
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={modal.isOpen}
          onClose={() => setModal({ ...modal, isOpen: false, onConfirm: undefined })}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onConfirm={modal.onConfirm}
          confirmText={modal.onConfirm ? 'Yes, Cancel Order' : 'OK'}
          cancelText="No, Keep Order"
        />
      </main>
    </>
  )
}
