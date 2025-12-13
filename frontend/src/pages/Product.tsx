import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { Product } from '../types'
import { productService } from '../services/productService'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import axios from '../services/axios'

interface Review {
  _id: string
  userId: { firstName: string; lastName: string }
  userName: string
  rating: number
  comment: string
  createdAt: string
  userBanned?: boolean
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const { addToCart } = useCart()
  const { user } = useAuth()
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [canReview, setCanReview] = useState(false)
  const [reviewReason, setReviewReason] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadProduct(id)
      loadReviews(id)
    }
  }, [id])

  useEffect(() => {
    if (id && user) {
      checkCanReview(id)
    }
  }, [id, user])

  const loadProduct = async (productId: string) => {
    setLoading(true)
    try {
      const data = await productService.getProduct(productId)
      setProduct(data)
    } catch (error) {
      console.error('Failed to load product:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async (productId: string) => {
    try {
      const response = await axios.get(`/api/reviews/product/${productId}`)
      setReviews(response.data.data || [])
    } catch (error) {
      console.error('Failed to load reviews:', error)
    }
  }

  const checkCanReview = async (productId: string) => {
    try {
      const response = await axios.get(`/api/reviews/can-review/${productId}`)
      setCanReview(response.data.canReview)
      setReviewReason(response.data.reason || null)
    } catch (error) {
      console.error('Failed to check review eligibility:', error)
      setCanReview(false)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return
    
    // Use _id (MongoDB) or id as fallback
    const productId = product._id || product.id
    if (!productId) {
      setMessage({ text: 'Invalid product', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    
    // Validate quantity before attempting to add to cart
    // Use availableQuantity (calculated from orders) if available, fallback to quantity
    const availableStock = product.availableQuantity ?? product.quantity ?? 0
    if (quantity > availableStock) {
      setMessage({ 
        text: `Only ${availableStock} item(s) available in stock`, 
        type: 'error' 
      })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    
    try {
      await addToCart(productId, quantity)
      setMessage({ text: 'Added to cart!', type: 'success' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to add to cart'
      setMessage({ text: errorMsg, type: 'error' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setMessage({ text: 'Please login to leave a review', type: 'error' })
      return
    }

    try {
      await axios.post('/api/reviews', {
        productId: id,
        rating,
        comment,
      })
      
      setMessage({ text: 'Review posted!', type: 'success' })
      setComment('')
      setRating(5)
      loadReviews(id!)
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ text: error.response?.data?.message || 'Failed to post review', type: 'error' })
    }
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

  if (!product) {
    return (
      <>
        <Header />
        <main className="container">
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>Product not found</div>
        </main>
      </>
    )
  }

  const price = product.price || '0.00'
  const imageUrl = product.images && product.images.length > 0 
    ? `/api/uploads/image/${product.images[0]}`
    : 'https://via.placeholder.com/600x400?text=No+Image'
  
  const productName = product.name || product.title || 'Untitled'
  const productLocation = product.campus || product.location || 'Location not specified'
  
  // Check if current user is the seller - compare user.id with product.sellerId
  const isOwnProduct = user && product.sellerId && 
    String(product.sellerId) === String(user.id)

  return (
    <>
      <Header />
      
      <main id="main" className="container">
        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          <div>
            <img 
              src={imageUrl} 
              alt={productName} 
              style={{ width: '100%', borderRadius: 'var(--radius)' }}
            />
          </div>
          
          <div>
            <h1>{productName}</h1>
            <p className="price" style={{ fontSize: '2rem', margin: '1rem 0' }}>${price}</p>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>Condition:</strong> {product.condition}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Seller:</strong>{' '}
              <span
                onClick={() => {
                  const sid = (product.sellerId && (product.sellerId._id || product.sellerId)) || undefined
                  if (sid) navigate(`/user/${sid}`)
                }}
                style={{ color: product.sellerId ? '#2563eb' : 'inherit', cursor: product.sellerId ? 'pointer' : 'default', fontWeight: 600 }}
              >
                {product.sellerName || 'Unknown'}
              </span>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Location:</strong> {productLocation}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Category:</strong> {product.category}
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>Stock:</strong>{' '}
              <span style={{
                color: (product.availableQuantity ?? product.quantity ?? 0) === 0 ? '#dc2626' : (product.availableQuantity ?? product.quantity ?? 0) < 5 ? '#ea580c' : '#16a34a',
                fontWeight: 'bold'
              }}>
                {(product.availableQuantity ?? product.quantity ?? 0) === 0 ? 'Out of Stock' : 
                 (product.availableQuantity ?? product.quantity ?? 0) < 5 ? `Only ${product.availableQuantity ?? product.quantity} left!` : 
                 `${product.availableQuantity ?? product.quantity} available`}
              </span>
            </div>
            
            <p style={{ marginTop: '1.5rem' }}>{product.description}</p>
            
            {isOwnProduct ? (
              <div style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                background: 'var(--color-surface)', 
                borderRadius: 'var(--radius)',
                border: '2px solid var(--color-primary)'
              }}>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>This is your listing</h3>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  You cannot purchase or review your own product. View your listings in your profile to edit or manage this item.
                </p>
              </div>
            ) : (
              <>
                {(product.availableQuantity ?? product.quantity ?? 0) > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <label htmlFor="quantity">Quantity:</label>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      max={(product.availableQuantity ?? product.quantity) || 1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="input"
                      style={{ width: '100px', marginLeft: '1rem' }}
                    />
                  </div>
                )}
                
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddToCart}
                  disabled={(product.availableQuantity ?? product.quantity ?? 0) === 0}
                  style={{ 
                    marginTop: '1rem', 
                    width: '100%',
                    opacity: (product.availableQuantity ?? product.quantity ?? 0) === 0 ? 0.5 : 1,
                    cursor: (product.availableQuantity ?? product.quantity ?? 0) === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {(product.availableQuantity ?? product.quantity ?? 0) === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reviews Section - hide entirely for sellers with no reviews */}
        {(!isOwnProduct || reviews.length > 0) && (
        <div style={{ marginTop: '3rem' }}>
          <h2>Reviews</h2>
          
          {user && !isOwnProduct && canReview && (
            <form onSubmit={handleSubmitReview} style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
              <h3>Leave a Review</h3>
              
              <div style={{ marginTop: '1rem' }}>
                <label>Rating:</label>
                <div style={{ 
                  display: 'inline-flex', 
                  marginLeft: '1rem',
                  gap: '0.25rem',
                  fontSize: '2rem',
                  cursor: 'pointer'
                }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        color: star <= (hoverRating || rating) ? '#fbbf24' : '#d1d5db',
                        transition: 'color 0.15s ease, transform 0.1s ease',
                        transform: star === hoverRating ? 'scale(1.1)' : 'scale(1)',
                        display: 'inline-block'
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <label htmlFor="comment">Comment:</label>
                <textarea
                  id="comment"
                  className="textarea"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  style={{ width: '100%', marginTop: '0.5rem' }}
                />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Submit Review
              </button>
            </form>
          )}

          {user && !isOwnProduct && !canReview && reviewReason === 'not_received' && (
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Once you have received this product, you can leave a review.
              </p>
            </div>
          )}

          {user && !isOwnProduct && !canReview && reviewReason === 'already_reviewed' && (
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>
                You have already reviewed this product.
              </p>
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            {reviews.length === 0 ? (
              // Don't show "no reviews" message to sellers - they can't review their own product
              !isOwnProduct && (
                <p style={{ color: 'var(--color-text-muted)' }}>No reviews yet. Be the first to review!</p>
              )
            ) : (
              reviews.map((review) => (
                <div 
                  key={review._id} 
                  style={{ 
                    padding: '1rem', 
                    marginBottom: '1rem', 
                    background: review.userBanned ? '#fef2f2' : 'var(--color-surface)', 
                    borderRadius: 'var(--radius)',
                    border: review.userBanned ? '1px solid #fecaca' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{review.userName}</strong>
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
                    <div style={{ display: 'flex', gap: '0.125rem', fontSize: '1.25rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          style={{ color: star <= review.rating ? '#fbbf24' : '#d1d5db' }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <p style={{ marginTop: '0.5rem' }}>{review.comment}</p>
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
        )}
      </main>
    </>
  )
}
