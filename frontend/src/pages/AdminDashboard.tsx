import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import { adminService } from '../services/adminService'
import { useAuth } from '../context/AuthContext'

interface Stats {
  totalUsers: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  recentOrders: any[]
  topProducts: any[]
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    
    if (user.role !== 'admin1' && user.role !== 'admin2') {
      alert('Access Denied: Admin privileges required')
      navigate('/')
      return
    }

    loadStats()
  }, [user, navigate])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminService.getStats()
      setStats(response.data)
    } catch (error: any) {
      console.error('Error loading stats:', error)
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load dashboard statistics'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="container">Checking authentication...</div>
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="container">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p className="muted">Loading dashboard...</p>
          </div>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="container" style={{ maxWidth: '500px' }}>
          <div className="alert alert-error">{error}</div>
          <button onClick={loadStats} className="btn btn-primary">
            Retry
          </button>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      
      <main className="container">
        <header className="page-header">
          <h1>Admin Dashboard</h1>
          <p className="muted">Welcome back, {user.firstName || user.email}</p>
        </header>

        {/* Stats Grid */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '1rem' }}>
          <div className="card">
            <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Users</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.totalUsers || 0}</p>
          </div>
          <div className="card">
            <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Products</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.totalProducts || 0}</p>
          </div>
          <div className="card">
            <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Orders</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.totalOrders || 0}</p>
          </div>
          <div className="card">
            <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Revenue</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>${stats?.totalRevenue || '0.00'}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/admin/users" className="btn btn-primary">Manage Users</Link>
            <Link to="/admin/products" className="btn btn-primary">Manage Products</Link>
            <Link to="/admin/orders" className="btn btn-primary">Manage Orders</Link>
            <Link to="/admin/disputes" className="btn btn-ghost">Disputes</Link>
          </div>
        </section>

        {/* Role Info */}
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Your Permissions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                {user.role === 'admin2' ? '⭐ Admin Level 2 (Super Admin)' : '🔹 Admin Level 1'}
              </h3>
              <ul style={{ listStyle: 'none', lineHeight: '1.8' }}>
                <li>✓ View all users, products, orders</li>
                <li>✓ Create & update products and categories</li>
                <li>✓ View payment details in orders</li>
                <li>✓ Ban and unban user accounts</li>
                <li>✓ Resolve disputes with messaging</li>
                {user.role === 'admin2' && (
                  <>
                    <li style={{ color: 'var(--color-secondary)', fontWeight: '600' }}>⭐ Delete users, products, orders</li>
                    <li style={{ color: 'var(--color-secondary)', fontWeight: '600' }}>⭐ Create new admin accounts</li>
                    <li style={{ color: 'var(--color-secondary)', fontWeight: '600' }}>⭐ View deleted/archived items</li>
                  </>
                )}
              </ul>
            </div>

            {user.role === 'admin1' && (
              <div className="card" style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
                <h3 style={{ marginBottom: '0.75rem', color: '#b45309' }}>Admin2 Exclusive Powers</h3>
                <ul style={{ listStyle: 'none', lineHeight: '1.8', color: '#92400e' }}>
                  <li>• Delete users, products, and orders</li>
                  <li>• Create new admin1 and admin2 accounts</li>
                  <li>• View soft-deleted/archived items</li>
                  <li>• Full CRUD on all resources</li>
                </ul>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  Contact an Admin2 to upgrade your privileges.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Recent Orders */}
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Recent Orders</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Order ID</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Customer</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order: any) => (
                    <tr key={order._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>#{order._id.slice(-6)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{order.userId?.firstName || 'N/A'} {order.userId?.lastName || ''}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>${order.totalAmount || '0.00'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '1rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: order.status === 'delivered' ? '#d1fae5' : order.status === 'pending' ? '#fef3c7' : '#dbeafe',
                          color: order.status === 'delivered' ? '#065f46' : order.status === 'pending' ? '#92400e' : '#1e40af'
                        }}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }} className="muted">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p className="muted">No orders yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Recent Products */}
        <section style={{ marginTop: '2.5rem', marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Recent Listings (Live Pricing)</h2>
          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {stats.topProducts.map((product: any) => (
                <div key={product._id} className="card product-card">
                  {product.images?.[0] ? (
                    <img src={`/api/uploads/image/${product.images[0]}`} alt={product.name} className="product-image" />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '150px', 
                      background: 'var(--color-surface)', 
                      borderRadius: 'var(--radius)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <span className="muted">No image</span>
                    </div>
                  )}
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{product.name}</h3>
                  <p className="price">${product.price || '0.00'}</p>
                  <p className="location">{product.condition || 'N/A'}</p>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: product.status === 'available' ? '#d1fae5' : '#f3f4f6',
                    color: product.status === 'available' ? '#065f46' : '#6b7280'
                  }}>
                    {product.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p className="muted">No products yet</p>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
