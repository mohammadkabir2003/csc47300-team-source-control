import { Link } from 'react-router-dom'
import { Product } from '../types'

interface ProductCardProps {
  product: Product
  href?: string // optional override for link target
}

export default function ProductCard({ product, href }: ProductCardProps) {
  const price = product.price || '0.00'
  const imageUrl = product.images && product.images.length > 0 
    ? `/api/uploads/image/${product.images[0]}`
    : 'https://via.placeholder.com/300x200?text=No+Image'
  
  const productName = product.name || product.title || 'Untitled'
  const productLocation = product.campus || product.location || 'Location not specified'
  const productId = product._id || product.id
  const to = href ?? `/product/${productId}`

  const stockQuantity = product.availableQuantity ?? product.quantity ?? 0

  return (
    <Link to={to} className="card product-card" style={{ position: 'relative' }}>
      {stockQuantity === 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#dc2626',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          zIndex: 1
        }}>
          OUT OF STOCK
        </div>
      )}
      {stockQuantity > 0 && stockQuantity < 5 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#ea580c',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          zIndex: 1
        }}>
          ONLY {stockQuantity} LEFT
        </div>
      )}
      <img src={imageUrl} alt={productName} className="w-full h-40 object-cover rounded" />
      <h3>{productName}</h3>
      <p className="price">${price}</p>
      <p className="location">{productLocation}</p>
      <p className="muted">{product.condition}</p>
    </Link>
  )
}
