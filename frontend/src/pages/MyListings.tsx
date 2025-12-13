import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import axios from '../services/axios'

interface Product {
  _id: string
  name: string
  description: string
  price: string
  category: string
  condition: string
  status: 'available' | 'sold'
  quantity: number
  images: string[]
  createdAt: string
}

interface Review {
  _id: string
  rating: number
  comment: string
  userId: { firstName: string; lastName: string }
  createdAt: string
  userBanned?: boolean
}

interface Order {
  _id: string
  orderNumber: string
  status: string
  total: number
  userId: { firstName: string; lastName: string; email: string }
  createdAt: string
  items: Array<{ productId: string; quantity: number; price: number }>
  disputeId?: string | { _id: string }
}

export default function MyListings() {
  const [listings, setListings] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'orders'>('details')
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', status: 'available', quantity: 1 })
  const [modal, setModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' }>({ isOpen: false, message: '' })

  useEffect(() => {
    loadListings()
  }, [])

  const loadListings = async () => {
    try {
      const response = await axios.get('/api/products/user/my-products')
      setListings(response.data.data || [])
    } catch (error) {
      console.error('Failed to load listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadListingDetails = async (listing: Product) => {
    setSelectedListing(listing)
    setEditForm({
      name: listing.name,
      description: listing.description,
      price: listing.price,
      status: listing.status,
      quantity: listing.quantity
    })
    setEditMode(false)
    setActiveTab('details')

    
    try {
      const reviewRes = await axios.get(`/api/reviews/product/${listing._id}`)
      setReviews(reviewRes.data.data || [])
    } catch (error) {
      setReviews([])
    }
    
    try {
      const orderRes = await axios.get(`/api/orders/seller/my-orders`)
      const productOrders = (orderRes.data.data || []).filter((order: Order) =>
        order.items.some(item => item.productId === listing._id || (item.productId as any)?._id === listing._id)
      )
      setOrders(productOrders)
    } catch (error) {
      setOrders([])
    }
  }

  const hasActiveDispute = () => {
    return orders.some(order => order.disputeId)
  }

  const handleSaveEdit = async () => {
    if (!selectedListing) return

    try {
      const dataToSave = {
        ...editForm,
        price: parseFloat(editForm.price).toFixed(2),
        status: editForm.status as 'available' | 'sold'
      }
      await axios.put(`/api/products/${selectedListing._id}`, dataToSave)
      setModal({ isOpen: true, title: 'Success', message: 'Listing updated successfully', type: 'success' })
      setEditMode(false)
      loadListings()
      setSelectedListing({ ...selectedListing, ...dataToSave })
    } catch (error: any) {
      setModal({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to update listing', type: 'error' })
    }
  }

  const handleDeleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return

    try {
      await axios.delete(`/api/products/${id}`)
      setModal({ isOpen: true, title: 'Success', message: 'Listing deleted successfully', type: 'success' })
      setSelectedListing(null)
      loadListings()
    } catch (error: any) {
      setModal({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to delete listing', type: 'error' })
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      available: 'background: #059669; color: white;',
      sold: 'background: #dc2626; color: white;',
      pending: 'background: #6b7280; color: white;',
      waiting_to_meet: 'background: #3b82f6; color: white;',
      met_and_exchanged: 'background: #059669; color: white;',
      completed: 'background: #059669; color: white;',
      cancelled: 'background: #dc2626; color: white;'
    }
    return `padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; ${colors[status] || colors.pending}`
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString()

  if (loading) {
    return (
      <>
        <Header />
        <main className="container">
          <p>Loading your listings...</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <main className="container">
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>My Listings</h1>
            <p className="muted">Manage your products, view reviews and orders</p>
          </div>
          <Link to="/sell" className="btn btn-primary">+ New Listing</Link>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: selectedListing ? '300px 1fr' : '1fr', gap: '2rem' }}>
          {/* Listings List */}
          <div>
            {listings.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="muted">You haven't listed any products yet.</p>
                <Link to="/sell" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create Your First Listing</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {listings.map(listing => (
                  <div
                    key={listing._id}
                    onClick={() => loadListingDetails(listing)}
                    className="card"
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      border: selectedListing?._id === listing._id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {listing.images?.[0] ? (
                        <img
                          src={`/api/uploads/image/${listing.images[0]}`}
                          alt={listing.name}
                          style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                      ) : (
                        <div style={{ width: '60px', height: '60px', background: 'var(--color-surface)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="muted" style={{ fontSize: '0.625rem' }}>No img</span>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{listing.name}</h4>
                        <p style={{ margin: '0.25rem 0', fontWeight: 600, color: 'var(--color-primary)' }}>${listing.price}</p>
                        <span style={Object.fromEntries(getStatusBadge(listing.status).split(';').filter(s => s.trim()).map(s => s.split(':').map(p => p.trim())))}>{listing.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Listing Details Panel */}
          {selectedListing && (
            <div className="card" style={{ padding: '1.5rem' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <button
                  onClick={() => setActiveTab('details')}
                  className={activeTab === 'details' ? 'btn btn-primary' : 'btn-link'}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={activeTab === 'reviews' ? 'btn btn-primary' : 'btn-link'}
                >
                  Reviews ({reviews.length})
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={activeTab === 'orders' ? 'btn btn-primary' : 'btn-link'}
                >
                  Orders ({orders.length})
                </button>
              </div>

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div>
                  {editMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          className="input"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          disabled={hasActiveDispute()}
                        />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          className="input"
                          rows={4}
                          value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          disabled={hasActiveDispute()}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label>Price ($)</label>
                          <input
                            type="text"
                            className="input"
                            value={editForm.price}
                            onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                            disabled={hasActiveDispute()}
                          />
                        </div>
                        <div className="form-group">
                          <label>Status</label>
                          <select
                            className="input"
                            value={editForm.status}
                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            disabled={hasActiveDispute()}
                          >
                            <option value="available">Available</option>
                            <option value="sold">Sold</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Total Inventory</label>
                          <input
                            type="number"
                            className="input"
                            value={editForm.quantity}
                            onChange={e => setEditForm({ ...editForm, quantity: parseInt(e.target.value) })}
                            min="0"
                            disabled={hasActiveDispute()}
                          />
                        </div>
                      </div>
                      {hasActiveDispute() && (
                        <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1rem' }}>
                          <p style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>⚠️ Cannot edit listing - active dispute exists on related order</p>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={handleSaveEdit} className="btn btn-primary" disabled={hasActiveDispute()}>Save Changes</button>
                        <button onClick={() => setEditMode(false)} className="btn-link">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {selectedListing.images?.[0] ? (
                          <img
                            src={`/api/uploads/image/${selectedListing.images[0]}`}
                            alt={selectedListing.name}
                            style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '12px' }}
                          />
                        ) : (
                          <div style={{ width: '200px', height: '200px', background: 'var(--color-surface)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="muted">No image</span>
                          </div>
                        )}
                        <div>
                          <h2 style={{ margin: '0 0 0.5rem 0' }}>{selectedListing.name}</h2>
                          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 0.5rem 0' }}>${selectedListing.price}</p>
                          <span style={Object.fromEntries(getStatusBadge(selectedListing.status).split(';').filter(s => s.trim()).map(s => s.split(':').map(p => p.trim())))}>{selectedListing.status}</span>
                          <p className="muted" style={{ marginTop: '0.5rem' }}>Listed on {formatDate(selectedListing.createdAt)}</p>
                        </div>
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4>Description</h4>
                        <p>{selectedListing.description}</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                          <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>Category</p>
                          <p style={{ margin: 0, fontWeight: 500 }}>{selectedListing.category}</p>
                        </div>
                        <div>
                          <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>Condition</p>
                          <p style={{ margin: 0, fontWeight: 500 }}>{selectedListing.condition}</p>
                        </div>
                        <div>
                          <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>Original Listed</p>
                          <p style={{ margin: 0, fontWeight: 500 }}>{selectedListing.quantity} units</p>
                          {(selectedListing as any).availableQuantity !== undefined && (
                            <>
                              <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>Available Now</p>
                              <p style={{ 
                                margin: 0, 
                                fontWeight: 600,
                                color: (selectedListing as any).availableQuantity === 0 ? '#dc2626' : 
                                       (selectedListing as any).availableQuantity < 5 ? '#ea580c' : '#16a34a'
                              }}>
                                {(selectedListing as any).availableQuantity} units
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {hasActiveDispute() && (
                        <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1rem' }}>
                          <p style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>⚠️ Cannot edit listing - active dispute exists on related order</p>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setEditMode(true)} className="btn btn-primary" disabled={hasActiveDispute()}>Edit Listing</button>
                        <button onClick={() => handleDeleteListing(selectedListing._id)} className="btn-link" style={{ color: 'var(--color-error)' }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  {reviews.length === 0 ? (
                    <p className="muted">No reviews yet for this product.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {reviews.map(review => (
                        <div key={review._id} style={{ 
                          padding: '1rem', 
                          background: review.userBanned ? '#fef2f2' : 'var(--color-surface)', 
                          borderRadius: '8px',
                          border: review.userBanned ? '1px solid #fecaca' : 'none'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <strong>{review.userId?.firstName} {review.userId?.lastName}</strong>
                              {review.userBanned && (
                                <span style={{
                                  background: '#dc2626',
                                  color: 'white',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  padding: '0.125rem 0.375rem',
                                  borderRadius: '4px',
                                  textTransform: 'uppercase'
                                }}>
                                  Banned User
                                </span>
                              )}
                              <span style={{ marginLeft: review.userBanned ? '0' : '0.75rem', color: '#f59e0b' }}>
                                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                              </span>
                            </div>
                            <span className="muted" style={{ fontSize: '0.875rem' }}>{formatDate(review.createdAt)}</span>
                          </div>
                          <p style={{ margin: 0 }}>{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div>
                  {orders.length === 0 ? (
                    <p className="muted">No orders yet for this product.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {orders.map(order => (
                        <div key={order._id} style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div>
                              <strong>Order #{order.orderNumber}</strong>
                              <p style={{ margin: '0.25rem 0' }} className="muted">
                                Buyer: {order.userId?.firstName} {order.userId?.lastName}
                              </p>
                            </div>
                            <span style={Object.fromEntries(getStatusBadge(order.status).split(';').filter(s => s.trim()).map(s => s.split(':').map(p => p.trim())))}>{order.status.replace(/_/g, ' ')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="muted" style={{ fontSize: '0.875rem' }}>{formatDate(order.createdAt)}</span>
                            <strong>${order.total?.toFixed(2)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
