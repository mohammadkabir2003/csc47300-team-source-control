import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import ProductCard from '../components/ProductCard'
import { userService } from '../services/userService'

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadUserData()
  }, [id])

  const loadUserData = async () => {
    try {
      const res = await userService.getUserById(id!)
      setUserData(res.data)
    } catch (error) {
      console.error('Error loading user profile', error)
      alert('User not found')
      navigate('/')
    } finally {
      setLoading(false)
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

  if (!userData) {
    return (
      <>
        <Header />
        <main className="container">
          <p>User not found</p>
        </main>
      </>
    )
  }

  const { user: userProfile, history } = userData

  return (
    <>
      <Header />
      <main className="container">
        <header className="page-header">
          <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: '1rem' }}>
            ← Back
          </button>
          <h1>{userProfile.firstName} {userProfile.lastName}</h1>
          <p className="muted">User ID: {id}</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <h2>Profile</h2>
            <p><strong>Email:</strong> {userProfile.email}</p>
            <p><strong>Role:</strong> {userProfile.role}</p>
            <p><strong>Member Since:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
          </div>

          <div>
            {history.products && (
              <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h2>Products ({history.totalProducts})</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  {history.products.map((p: any) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              </div>
            )}

            {history.reviews && history.reviews.length > 0 && (
              <div className="card" style={{ padding: '1rem' }}>
                <h2>Reviews ({history.totalReviews})</h2>
                    <div className="space-y-3">
                      {history.reviews.map((r: any) => (
                        <div key={r._id} style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ color: '#f59e0b', fontSize: '1rem', lineHeight: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                            </div>
                            <div className="muted" style={{ fontSize: '0.875rem' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>{r.comment}</div>
                        </div>
                      ))}
                    </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
