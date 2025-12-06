import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function User() {
  const { user, logout } = useAuth()

  if (!user) {
    return (
      <>
        <Header />
        <main className="container">
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p className="muted">Please log in to view your profile</p>
            <a href="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Log In
            </a>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      
      <main id="main" className="container" style={{ maxWidth: '600px' }}>
        <header className="page-header">
          <h1>My Profile</h1>
        </header>

        <div className="card">
          <h3>Account Information</h3>
          
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Email:</strong> {user.email}
            </div>
            
            {(user.first_name || user.firstName) && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Name:</strong> {user.first_name || user.firstName} {user.last_name || user.lastName}
              </div>
            )}
            
            {user.phone && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Phone:</strong> {user.phone}
              </div>
            )}
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>User ID:</strong> {user.id}
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>Account Type:</strong>{' '}
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                backgroundColor: 
                  user.role === 'admin2' ? '#dc2626' :
                  user.role === 'admin1' ? '#ea580c' :
                  '#16a34a',
                color: 'white'
              }}>
                {user.role === 'admin2' ? 'Super Admin (Admin2)' :
                 user.role === 'admin1' ? 'Admin (Admin1)' :
                 user.role === 'user' ? 'Standard User' :
                 user.role || 'User'}
              </span>
            </div>

            {user.role === 'admin1' && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                backgroundColor: 'var(--color-surface)', 
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}>
                <strong>Privileges:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                  <li>Create, Read, Update products</li>
                  <li>Manage users (view, update)</li>
                  <li>View and manage orders</li>
                  <li>Resolve disputes</li>
                  <li>Ban/unban users</li>
                </ul>
              </div>
            )}

            {user.role === 'admin2' && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                backgroundColor: 'var(--color-surface)', 
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}>
                <strong>Privileges:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                  <li><strong>Full CRUD access</strong> on all resources</li>
                  <li>Create new admin accounts (admin1 & admin2)</li>
                  <li>Soft delete any user or product</li>
                  <li>View deleted records</li>
                  <li>Manage disputes and resolve conflicts</li>
                  <li>Ban/unban users</li>
                  <li>Access all admin features</li>
                </ul>
              </div>
            )}
            
            {user.isSeller && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Seller Status:</strong>{' '}
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Active</span>
              </div>
            )}
            
            {user.isEmailVerified !== undefined && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Email Verified:</strong>{' '}
                <span style={{ color: user.isEmailVerified ? '#16a34a' : '#ea580c' }}>
                  {user.isEmailVerified ? '✓ Verified' : '⚠ Not Verified'}
                </span>
              </div>
            )}
            
            {user.createdAt && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/my-listings" className="btn btn-primary">My Listings</Link>
            <Link to="/orders" className="btn btn-primary">View Orders</Link>
            {user.role !== 'admin1' && user.role !== 'admin2' && (
              <Link to="/sell" className="btn btn-ghost">Sell an Item</Link>
            )}
            {(user.role === 'admin1' || user.role === 'admin2') && (
              <Link to="/admin" className="btn btn-primary" style={{ backgroundColor: '#dc2626' }}>
                Admin Dashboard
              </Link>
            )}
            <button onClick={logout} className="btn btn-ghost">Log Out</button>
          </div>
        </div>
      </main>
    </>
  )
}
