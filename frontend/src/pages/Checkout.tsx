import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useCart } from '../context/CartContext'
import { orderService } from '../services/orderService'

export default function Checkout() {
  const { cartItems, clearCart, getTotalPrice } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  
  // Billing address state
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  })
  
  // Payment card state
  const [cardNumber, setCardNumber] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardholderName, setCardholderName] = useState('')

  const total = getTotalPrice() // Already formatted string

  const validateCard = () => {
    // Validate card number (16 digits)
    if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) {
      setError('Card number must be 16 digits')
      return false
    }

    // Validate expiration date (MM/YY format and must be future date)
    if (!/^\d{2}\/\d{2}$/.test(expirationDate)) {
      setError('Expiration date must be in MM/YY format')
      return false
    }

    const [month, year] = expirationDate.split('/').map(Number)
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear() % 100 // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1

    if (month < 1 || month > 12) {
      setError('Invalid expiration month')
      return false
    }

    if (year < currentYear || (year === currentYear && month <= currentMonth)) {
      setError('Card has expired or expiration date is invalid')
      return false
    }

    // Validate CVV (3-4 digits)
    if (!/^\d{3,4}$/.test(cvv)) {
      setError('CVV must be 3 or 4 digits')
      return false
    }

    if (!cardholderName.trim()) {
      setError('Cardholder name is required')
      return false
    }

    return true
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate billing address
    if (!billingAddress.street || !billingAddress.city || !billingAddress.state || !billingAddress.zipCode) {
      setError('Please fill in all billing address fields')
      return
    }
    
    // Validate card
    if (!validateCard()) {
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const items = cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }))

      // Extract only last 4 digits of card
      const cleanCardNumber = cardNumber.replace(/\s/g, '')
      const cardLastFour = cleanCardNumber.slice(-4)

      await orderService.createOrder(items, billingAddress, 'credit_card', cardLastFour)
      await clearCart()
      navigate('/orders')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <>
        <Header />
        <main className="container">
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p className="muted">Your cart is empty</p>
            <a href="/market" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Browse Products
            </a>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      
      <main id="main" className="container">
        <header className="page-header">
          <h1>Checkout</h1>
        </header>

        {error && <div className="alert alert-error" style={{ padding: '1rem', background: '#fee', color: '#c00', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          <div>
            {/* Billing Address Form */}
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2>Billing Address</h2>
              <div className="form-group">
                <label htmlFor="street">Street Address</label>
                <input
                  id="street"
                  type="text"
                  className="input"
                  value={billingAddress.street}
                  onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    className="input"
                    value={billingAddress.city}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input
                    id="state"
                    type="text"
                    className="input"
                    value={billingAddress.state}
                    onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="zipCode">ZIP Code</label>
                  <input
                    id="zipCode"
                    type="text"
                    className="input"
                    value={billingAddress.zipCode}
                    onChange={(e) => setBillingAddress({ ...billingAddress, zipCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <input
                    id="country"
                    type="text"
                    className="input"
                    value={billingAddress.country}
                    onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2>Payment Information</h2>
              <p className="muted" style={{ marginBottom: '1rem' }}>Note: Pickup is handled by default. Payment is for order confirmation only.</p>
              
              <div className="form-group">
                <label htmlFor="cardholderName">Cardholder Name</label>
                <input
                  id="cardholderName"
                  type="text"
                  className="input"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="cardNumber">Card Number</label>
                <input
                  id="cardNumber"
                  type="text"
                  className="input"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '')
                    const formatted = value.match(/.{1,4}/g)?.join(' ') || value
                    setCardNumber(formatted)
                  }}
                  required
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="expirationDate">Expiration Date</label>
                  <input
                    id="expirationDate"
                    type="text"
                    className="input"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={expirationDate}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '')
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4)
                      }
                      setExpirationDate(value)
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cvv">CVV</label>
                  <input
                    id="cvv"
                    type="text"
                    className="input"
                    placeholder="123"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <h2>Order Summary</h2>
            {cartItems.map(item => {
              const product = item.product
              if (!product) return null

              const price = product.price || '0.00'
              const subtotal = (parseFloat(price) * item.quantity).toFixed(2)

              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <strong>{product.title}</strong>
                    <p className="muted">Quantity: {item.quantity} × ${price}</p>
                  </div>
                  <div>${subtotal}</div>
                </div>
              )
            })}
          </div>

          <div className="card">
            <h3>Total</h3>
            <p className="price" style={{ fontSize: '2rem', margin: '1rem 0' }}>${total}</p>
            
            <form onSubmit={handleCheckout}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Placing order...' : 'Place Order'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
