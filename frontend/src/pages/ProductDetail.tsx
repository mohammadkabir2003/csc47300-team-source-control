import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminService } from '../services/adminService'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [productData, setProductData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editRating, setEditRating] = useState(5)

  useEffect(() => {
    if (!user || (user.role !== 'admin1' && user.role !== 'admin2')) {
      navigate('/login')
      return
    }
    if (id) {
      loadProductData()
    }
  }, [user, navigate, id])

  const loadProductData = async () => {
    try {
      const response = await adminService.getProductById(id!)
      setProductData(response.data.data)
    } catch (error) {
      console.error('Error loading product:', error)
      alert('Error loading product details')
      navigate('/admin/products')
    } finally {
      setLoading(false)
    }
  }

  const handleEditReview = (review: any) => {
    setEditingReviewId(review._id)
    setEditComment(review.comment)
    setEditRating(review.rating)
  }

  const handleSaveReview = async (reviewId: string) => {
    try {
      await adminService.updateReview(reviewId, {
        comment: editComment,
        rating: editRating
      })
      setEditingReviewId(null)
      loadProductData() // Reload to show updated review
    } catch (error) {
      console.error('Error updating review:', error)
      alert('Failed to update review')
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review? You can restore it later if needed.')) {
      return
    }
    try {
      await adminService.deleteReview(reviewId)
      loadProductData() // Reload to reflect deletion
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Failed to delete review')
    }
  }

  const handleRestoreReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to restore this review?')) {
      return
    }
    try {
      await adminService.restoreReview(reviewId)
      loadProductData() // Reload to reflect restoration
    } catch (error) {
      console.error('Error restoring review:', error)
      alert('Failed to restore review')
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="container">
          <p>Loading...</p>
        </main>
      </>
    )
  }

  if (!productData) {
    return (
      <>
        <Header />
        <main className="container">
          <p>Product not found</p>
        </main>
      </>
    )
  }

  const { product, reviews, deletedReviews = [], averageRating } = productData

  const imageUrl = product.images && product.images.length > 0
    ? `/api/uploads/image/${product.images[0]}`
    : null

  return (
    <>
      <Header />
      <main className="container">
        <header className="page-header">
          <button 
            onClick={() => navigate('/admin/products')}
            className="btn btn-ghost"
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Products
          </button>
          <h1>{product.name}</h1>
          <p className="muted">Product ID: {id}</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          {/* Product Image */}
          <div>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: 'var(--radius)' }}
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '400px', 
                background: 'var(--color-surface)', 
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span className="muted">No image available</span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: product.status === 'available' ? '#d1fae5' : '#fee2e2',
                color: product.status === 'available' ? '#065f46' : '#991b1b'
              }}>
                {product.status}
              </span>
              {product.isDeleted && (
                <span style={{
                  marginLeft: '0.5rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: '#fee2e2',
                  color: '#991b1b'
                }}>
                  🗑️ DELETED
                </span>
              )}
            </div>

            <p className="price" style={{ fontSize: '2rem', margin: '1rem 0' }}>${product.price || '0.00'}</p>

            {averageRating > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#fbbf24', fontSize: '1.25rem' }}>
                  {'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}
                </span>
                <span className="muted">
                  {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="muted" style={{ fontSize: '0.875rem' }}>Category</label>
                <p style={{ fontWeight: 600 }}>{product.category || 'Uncategorized'}</p>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="muted" style={{ fontSize: '0.875rem' }}>Condition</label>
                <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{product.condition}</p>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="muted" style={{ fontSize: '0.875rem' }}>Quantity Available</label>
                <p style={{ fontWeight: 600 }}>{product.availableQuantity ?? product.quantity}</p>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="muted" style={{ fontSize: '0.875rem' }}>Seller</label>
                <p style={{ fontWeight: 600 }}>{product.sellerName || 'Unknown'}</p>
                <p className="muted" style={{ fontSize: '0.875rem' }}>{product.sellerEmail}</p>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="muted" style={{ fontSize: '0.875rem' }}>Campus</label>
                <p style={{ fontWeight: 600 }}>{product.campus}</p>
              </div>
              <div>
                <label className="muted" style={{ fontSize: '0.875rem' }}>Listed On</label>
                <p style={{ fontWeight: 600 }}>
                  {new Date(product.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Description</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{product.description}</p>
        </div>

        {/* Reviews Section */}
        <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Reviews ({reviews.length})</h2>
          
          {reviews.length === 0 ? (
            <p className="muted">No reviews yet for this product.</p>
          ) : (
            <>
              {/* Rating Summary */}
              <div style={{ 
                background: 'var(--color-surface)', 
                padding: '1rem', 
                borderRadius: 'var(--radius)',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 700 }}>{averageRating.toFixed(1)}</span>
                  <div>
                    <div style={{ color: '#fbbf24', fontSize: '1.5rem' }}>
                      {'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}
                    </div>
                    <p className="muted">{reviews.length} total reviews</p>
                  </div>
                </div>

                {/* Rating Breakdown */}
                <div>
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = reviews.filter((r: any) => r.rating === rating).length
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                    return (
                      <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ width: '40px', fontSize: '0.875rem' }}>{rating} ★</span>
                        <div style={{ 
                          flex: 1, 
                          height: '12px', 
                          background: 'var(--color-border)', 
                          borderRadius: '6px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            background: '#fbbf24',
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ width: '30px', textAlign: 'right', fontSize: '0.875rem' }} className="muted">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Individual Reviews */}
              <div>
                {reviews.map((review: any) => (
                  <div key={review._id} style={{ 
                    padding: '1rem 0', 
                    borderBottom: '1px solid var(--color-border)',
                    background: review.userBanned ? '#fef2f2' : 'transparent',
                    paddingLeft: review.userBanned ? '1rem' : 0,
                    paddingRight: review.userBanned ? '1rem' : 0,
                    borderRadius: review.userBanned ? 'var(--radius)' : 0,
                    marginBottom: review.userBanned ? '0.5rem' : 0
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <p style={{ fontWeight: 600, margin: 0 }}>
                            {review.userId?.firstName} {review.userId?.lastName}
                          </p>
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
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{ color: '#fbbf24' }}>
                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </span>
                          <span className="muted" style={{ fontSize: '0.875rem' }}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                          {review.editedAt && (
                            <span className="muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                              (edited)
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Admin Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {editingReviewId !== review._id && (
                          <button
                            onClick={() => handleEditReview(review)}
                            className="btn btn-ghost"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {user?.role === 'admin2' && (
                          <button
                            onClick={() => handleDeleteReview(review._id)}
                            className="btn btn-ghost"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', color: '#dc2626' }}
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {editingReviewId === review._id ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        {/* Edit Rating */}
                        <div style={{ marginBottom: '0.5rem' }}>
                          <label style={{ fontSize: '0.875rem', marginRight: '0.5rem' }}>Rating:</label>
                          <select
                            value={editRating}
                            onChange={(e) => setEditRating(Number(e.target.value))}
                            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          >
                            {[5, 4, 3, 2, 1].map(r => (
                              <option key={r} value={r}>{r} ★</option>
                            ))}
                          </select>
                        </div>
                        {/* Edit Comment */}
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          style={{ 
                            width: '100%', 
                            minHeight: '80px', 
                            padding: '0.5rem',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--color-border)',
                            marginBottom: '0.5rem'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleSaveReview(review._id)}
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingReviewId(null)}
                            className="btn btn-ghost"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Deleted Reviews Section (Admin2 only) */}
          {user?.role === 'admin2' && deletedReviews.length > 0 && (
            <div style={{ marginTop: '3rem' }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 600, 
                marginBottom: '1rem',
                color: '#dc2626'
              }}>
                Deleted Reviews ({deletedReviews.length})
              </h3>
              <div>
                {deletedReviews.map((review: any) => (
                  <div key={review._id} style={{ 
                    padding: '1rem 0', 
                    borderBottom: '1px solid var(--color-border)',
                    background: '#fef2f2',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    borderRadius: 'var(--radius)',
                    marginBottom: '0.5rem',
                    border: '2px solid #fecaca'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <p style={{ fontWeight: 600, margin: 0, opacity: 0.6 }}>
                            {review.userId?.firstName} {review.userId?.lastName}
                          </p>
                          <span style={{
                            background: '#dc2626',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            DELETED
                          </span>
                          {review.userBanned && (
                            <span style={{
                              background: '#ea580c',
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
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{ color: '#fbbf24', opacity: 0.6 }}>
                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </span>
                          <span className="muted" style={{ fontSize: '0.875rem' }}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                          {review.deletedAt && (
                            <span className="muted" style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#dc2626' }}>
                              (deleted {new Date(review.deletedAt).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Restore Button */}
                      <button
                        onClick={() => handleRestoreReview(review._id)}
                        className="btn btn-ghost"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', color: '#16a34a', border: '1px solid #16a34a' }}
                      >
                        ↺ Restore
                      </button>
                    </div>
                    <p style={{ opacity: 0.7 }}>{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
