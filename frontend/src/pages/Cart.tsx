import Header from '../components/Header'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice } = useCart()

  const total = getTotalPrice() // Already formatted as string

  return (
    <>
      <Header />
      
      <main id="main" className="container">
        <header className="page-header">
          <h1>Shopping Cart</h1>
        </header>

        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p className="muted">Your cart is empty</p>
            <a href="/market" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Browse Products
            </a>
          </div>
        ) : (
          <>
            <div style={{ marginTop: '2rem' }}>
              {cartItems.map(item => {
                const product = item.product
                if (!product) return null

                const price = product.price || '0.00'
                const subtotal = (parseFloat(price) * item.quantity).toFixed(2)
                const imageUrl = product.images?.[0] 
                  ? `/api/uploads/image/${product.images[0]}` 
                  : 'https://via.placeholder.com/100'

                return (
                  <div key={item.id} className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                    <img 
                      src={imageUrl} 
                      alt={product.title}
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <h3>{product.title}</h3>
                      <p className="muted">${price} each</p>
                      <div style={{ marginTop: '0.5rem' }}>
                        <label htmlFor={`qty-${item.id}`}>Quantity: </label>
                        <input
                          id={`qty-${item.id}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                          style={{ width: '80px', marginLeft: '0.5rem' }}
                          className="input"
                        />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="price">${subtotal}</p>
                      <button 
                        onClick={() => removeFromCart(product.id)}
                        className="btn btn-sm btn-ghost"
                        style={{ marginTop: '0.5rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card" style={{ marginTop: '2rem', textAlign: 'right' }}>
              <h2>Total: ${total}</h2>
              <a href="/checkout" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Proceed to Checkout
              </a>
            </div>
          </>
        )}
      </main>
    </>
  )
}
