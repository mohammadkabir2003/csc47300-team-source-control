import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'

export default function Header() {
  const { user, logout } = useAuth()
  const { getTotalItems } = useCart()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const cartCount = getTotalItems()

  return (
    <>
      <a className="skip-to-content" href="#main">Skip to content</a>
      
      <header className="site-header">
        <div className="wrap">
          <Link className="brand" to="/">CCNY Exchange</Link>
          <nav aria-label="Primary">
            <Link className="nav-link" to="/">Home</Link>
            <Link className="nav-link" to="/market">Browse</Link>
            <Link className="nav-link" to="/sell">Sell an Item</Link>
            <Link className="nav-link" to="/safety">Safety</Link>
            <Link className="nav-link" to="/cart">
              Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            <Link className="nav-link" to="/orders">Orders</Link>
            
            <button 
              className={`dark-mode-toggle ${isDarkMode ? 'active' : ''}`}
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              <span className="toggle-slider"></span>
            </button>
            
            {user ? (
              <>
                <Link className="nav-link" to="/user">{user.first_name || user.email}</Link>
                <button className="btn btn-sm btn-ghost" onClick={logout}>Log Out</button>
              </>
            ) : (
              <>
                <Link className="nav-link" to="/login">Log In</Link>
                <Link className="btn btn-primary btn-sm" to="/signup">Sign Up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  )
}
