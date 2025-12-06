import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { adminService } from '../services/adminService'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Modal from '../components/Modal'

export default function AdminOrders() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [orderPayment, setOrderPayment] = useState<any>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  })
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardHolderName: '',
    expiryDate: '',
    cvv: ''
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
    loadOrders()
  }, [user, navigate, statusFilter, showDeleted])

  const loadOrders = async () => {
    try {
      const response = await adminService.getOrders({ status: statusFilter, includeDeleted: showDeleted })
      setOrders(response.data)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPaymentForOrder = async (orderId: string) => {
    try {
      setLoadingPayment(true)
      const response = await adminService.getPayments({ orderId })
      console.log('Full API response:', JSON.stringify(response, null, 2))
      if (response.data.payments && response.data.payments.length > 0) {
        console.log('Payment object:', JSON.stringify(response.data.payments[0], null, 2))
        console.log('cardDetails:', response.data.payments[0].cardDetails)
        setOrderPayment(response.data.payments[0])
      } else {
        console.log('No payments found for orderId:', orderId)
        setOrderPayment(null)
      }
    } catch (error) {
      console.error('Error loading payment:', error)
      setOrderPayment(null)
    } finally {
      setLoadingPayment(false)
    }
  }

  const handleEditOrder = async (order: any) => {
    setEditingOrder(order)
    await loadPaymentForOrder(order._id)
  }

  const handleUpdateOrder = async (orderId: string, updates: any) => {
    try {
      console.log('Updating order:', orderId, 'with:', updates)
      await adminService.updateOrder(orderId, updates)
      setEditingOrder(null)
      setLoading(true) // Force loading state
      await loadOrders() // Wait for reload to complete
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'Order updated successfully',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error updating order:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error updating order'
      setModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
        type: 'error'
      })
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this order?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await adminService.deleteOrder(orderId)
          await loadOrders()
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'Order deleted successfully',
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error deleting order:', error)
          const errorMessage = error.response?.data?.message || error.message || 'Error deleting order'
          setModal({
            isOpen: true,
            title: 'Error',
            message: errorMessage,
            type: 'error'
          })
        }
      }
    })
  }

  const handleRestoreOrder = async (orderId: string, orderNumber: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Restore',
      message: `Restore order ${orderNumber}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await adminService.restoreOrder(orderId)
          await loadOrders()
          setModal({
            isOpen: true,
            title: 'Success',
            message: `Order ${orderNumber} has been restored`,
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error restoring order:', error)
          const errorMessage = error.response?.data?.message || error.message || 'Error restoring order'
          setModal({
            isOpen: true,
            title: 'Error',
            message: errorMessage,
            type: 'error'
          })
        }
      }
    })
  }

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment)
    setBillingAddress({
      street: payment.billingAddress?.street || '',
      city: payment.billingAddress?.city || '',
      state: payment.billingAddress?.state || '',
      zipCode: payment.billingAddress?.zipCode || '',
      country: payment.billingAddress?.country || ''
    })
    setCardDetails({
      cardNumber: payment.cardDetails?.cardNumber || '',
      cardHolderName: payment.cardDetails?.cardHolderName || '',
      expiryDate: payment.cardDetails?.expiryDate || '',
      cvv: payment.cardDetails?.cvv || ''
    })
  }

  const handleUpdatePayment = async () => {
    if (!editingPayment) return
    
    // Validate card number (16 digits)
    const cardNumberClean = cardDetails.cardNumber.replace(/\s/g, '')
    if (!/^\d{16}$/.test(cardNumberClean)) {
      setModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Card number must be exactly 16 digits',
        type: 'error'
      })
      return
    }

    // Validate CVV (3-4 digits)
    if (!/^\d{3,4}$/.test(cardDetails.cvv)) {
      setModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'CVV must be digits only',
        type: 'error'
      })
      return
    }

    // Validate expiry date (MM/YY format)
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/
    if (!expiryRegex.test(cardDetails.expiryDate)) {
      setModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Expiry date must be in MM/YY format',
        type: 'error'
      })
      return
    }

    // Check if card is expired
    const [month, year] = cardDetails.expiryDate.split('/')
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (expiryDate < today) {
      setModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Card expiry date has passed',
        type: 'error'
      })
      return
    }

    try {
      await adminService.updatePayment(editingPayment._id, {
        billingAddress,
        cardDetails: {
          ...cardDetails,
          cardNumber: cardNumberClean
        }
      })
      setEditingPayment(null)
      await loadPaymentForOrder(editingOrder._id)
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'Payment information updated successfully',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error updating payment information:', error)
      setModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Error updating payment information',
        type: 'error'
      })
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'delivered':
        return { backgroundColor: 'var(--color-success)', color: 'white' }
      case 'cancelled':
        return { backgroundColor: 'var(--color-error)', color: 'white' }
      case 'pending':
        return { backgroundColor: 'var(--color-secondary)', color: 'white' }
      default:
        return { backgroundColor: 'var(--color-primary)', color: 'white' }
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container">
          <p className="muted">Loading orders...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="page-header">
          <h1>Manage Orders</h1>
          <Link to="/admin" className="btn btn-ghost">← Back to Dashboard</Link>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0, maxWidth: '300px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {user?.role === 'admin2' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Show Deleted Orders (Archive)</span>
              </label>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Order #</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Items</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Total</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr 
                  key={order._id} 
                  style={{ 
                    borderBottom: '1px solid var(--color-border)',
                    background: order.isDeleted ? '#f3f4f6' : 'transparent',
                    opacity: order.isDeleted ? 0.7 : 1
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {order.orderNumber}
                    {order.isDeleted && <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontSize: '0.7rem' }}>(DELETED)</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                    {order.userId?.firstName} {order.userId?.lastName}
                    <br />
                    <span className="muted" style={{ fontSize: '0.75rem' }}>{order.userId?.email}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{order.items.length} items</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>${order.totalAmount || '0.00'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      ...getStatusStyle(order.status),
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }} className="muted">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      onClick={() => handleEditOrder(order)}
                      className="btn btn-sm btn-primary"
                      style={{ marginRight: '0.5rem' }}
                    >
                      View Details
                    </button>
                    {user?.role === 'admin2' && (
                      <>
                        {order.isDeleted ? (
                          <button
                            onClick={() => handleRestoreOrder(order._id, order.orderNumber)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#10b981', color: 'white' }}
                          >
                            ♻️ Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteOrder(order._id)}
                            className="btn btn-sm"
                            style={{ backgroundColor: 'var(--color-error)', color: 'white' }}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="muted">No orders found</p>
          </div>
        )}

        {/* Edit Modal */}
        {editingOrder && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
            overflow: 'auto'
          }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', margin: '2rem auto' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Order Details - {editingOrder.orderNumber}</h2>
              
              {/* Customer Info */}
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                backgroundColor: 'var(--color-surface)', 
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)'
              }}>
                <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>Customer</h3>
                <p><strong>{editingOrder.userId?.firstName} {editingOrder.userId?.lastName}</strong></p>
                <p className="muted" style={{ fontSize: '0.875rem' }}>{editingOrder.userId?.email}</p>
              </div>

              {/* Payment Details */}
              {loadingPayment ? (
                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-surface)', 
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)'
                }}>
                  <p className="muted">Loading payment details...</p>
                </div>
              ) : orderPayment ? (
                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1rem', 
                  backgroundColor: orderPayment.isDeleted ? '#fef2f2' : 'var(--color-surface)', 
                  borderRadius: 'var(--radius)',
                  border: orderPayment.isDeleted ? '2px solid #dc2626' : '1px solid var(--color-border)'
                }}>
                  <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>Payment Information</h3>
                  {orderPayment.isDeleted && (
                    <p style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      ⚠️ PAYMENT DELETED
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div>
                      <span className="muted">Amount:</span>
                      <p style={{ fontWeight: 600 }}>${orderPayment.amount || '0.00'}</p>
                    </div>
                    <div>
                      <span className="muted">Method:</span>
                      <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{orderPayment.paymentMethod?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="muted">Status:</span>
                      <p style={{ fontWeight: 600, textTransform: 'capitalize', color: orderPayment.status === 'completed' ? '#16a34a' : '#f59e0b' }}>{orderPayment.status}</p>
                    </div>
                    {orderPayment.cardDetails?.lastFourDigits && (
                      <div>
                        <span className="muted">Card Last 4:</span>
                        <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>****{orderPayment.cardDetails.lastFourDigits}</p>
                      </div>
                    )}
                    {orderPayment.transactionId && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className="muted">Transaction ID:</span>
                        <p style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>{orderPayment.transactionId}</p>
                      </div>
                    )}
                  </div>
                  {orderPayment.billingAddress && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                      <span className="muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Billing Address:</span>
                      <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                        {orderPayment.billingAddress.street}<br />
                        {orderPayment.billingAddress.city}, {orderPayment.billingAddress.state} {orderPayment.billingAddress.zipCode}<br />
                        {orderPayment.billingAddress.country}
                      </p>
                    </div>
                  )}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                    <span className="muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Card Last 4 Digits:</span>
                    <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>•••• {orderPayment.cardDetails?.lastFourDigits || 'Not available'}</p>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleEditPayment(orderPayment)}
                      className="btn btn-sm"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                    >
                      Edit Payment
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-surface)', 
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)'
                }}>
                  <p className="muted" style={{ fontSize: '0.875rem' }}>No payment information available</p>
                </div>
              )}

              {/* Order Details */}
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                backgroundColor: 'var(--color-surface)', 
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)'
              }}>
                <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>Order Items (Editable)</h3>
                {editingOrder.items.map((item: any, index: number) => (
                  <div key={index} style={{ marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Product</label>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.name}</p>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Quantity</label>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.quantity}</p>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Price ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price || ''}
                          onChange={(e) => {
                            const newItems = [...editingOrder.items]
                            newItems[index].price = e.target.value
                            const newTotal = newItems.reduce((sum, i) => sum + (parseFloat(i.price || '0') * i.quantity), 0).toFixed(2)
                            setEditingOrder({ ...editingOrder, items: newItems, totalAmount: newTotal })
                          }}
                          className="input"
                          style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                        />
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                      Subtotal: ${(parseFloat(item.price || '0') * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
                <div style={{ 
                  borderTop: '1px solid var(--color-border)', 
                  marginTop: '0.5rem', 
                  paddingTop: '0.5rem', 
                  fontWeight: 600, 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '1.125rem'
                }}>
                  <span>Total:</span>
                  <span>${editingOrder.totalAmount || '0.00'}</span>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                // Strip out populated productId object, keep only the fields we need
                const cleanedItems = editingOrder.items.map((item: any) => ({
                  productId: item.productId?._id || item.productId,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  image: item.image
                }))
                handleUpdateOrder(editingOrder._id, {
                  status: editingOrder.status,
                  items: cleanedItems,
                  totalAmount: editingOrder.totalAmount
                })
              }}>
                <div className="form-group">
                  <label>Order Status</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                    className="input"
                  >
                    <option value="waiting_to_meet">Waiting to Meet</option>
                    <option value="met_and_exchanged">Met and Exchanged</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {editingPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '28rem',
            width: '90%',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
            position: 'relative'
          }}>
            <button
              onClick={() => setEditingPayment(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                padding: 0,
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600, paddingRight: '2rem' }}>Edit Payment Information</h2>
            
            <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Billing Address</h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Street</label>
                <input 
                  type="text" 
                  className="input" 
                  value={billingAddress.street}
                  onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>City</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={billingAddress.city}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>State</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={billingAddress.state}
                    onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Zip Code</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={billingAddress.zipCode}
                    onChange={(e) => setBillingAddress({ ...billingAddress, zipCode: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Country</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={billingAddress.country}
                    onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Card Details</h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Card Number (16 digits)</label>
                <input 
                  type="text" 
                  className="input" 
                  maxLength={19}
                  value={cardDetails.cardNumber}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '')
                    if (value.length > 16) value = value.slice(0, 16)
                    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ')
                    setCardDetails({ ...cardDetails, cardNumber: formatted })
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Cardholder Name</label>
                <input 
                  type="text" 
                  className="input" 
                  value={cardDetails.cardHolderName}
                  onChange={(e) => setCardDetails({ ...cardDetails, cardHolderName: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Expiry Date (MM/YY)</label>
                  <input 
                    type="text" 
                    className="input" 
                    maxLength={5}
                    value={cardDetails.expiryDate}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '')
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4)
                      }
                      setCardDetails({ ...cardDetails, expiryDate: value })
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>CVV</label>
                  <input 
                    type="text" 
                    className="input" 
                    maxLength={4}
                    value={cardDetails.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setCardDetails({ ...cardDetails, cvv: value })
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingPayment(null)}
                className="btn"
                style={{ backgroundColor: 'var(--color-text-secondary)', color: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePayment}
                className="btn"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.onConfirm ? 'Yes' : undefined}
        cancelText={modal.onConfirm ? 'Cancel' : undefined}
      />
    </>
  )
}
