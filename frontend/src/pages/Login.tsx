import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/market')
    }
  }, [user, navigate])

  // Show message if already logged in
  if (user) {
    return (
      <>
        <Header />
        <div className="container" style={{ maxWidth: '500px', textAlign: 'center', marginTop: '3rem' }}>
          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>Already Logged In</h2>
            <p className="muted" style={{ marginBottom: '1.5rem' }}>You are already logged in as {user.email}</p>
            <button onClick={() => navigate('/market')} className="btn btn-primary">
              Go to Market
            </button>
          </div>
        </div>
      </>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/market')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      
      <main className="container" style={{ maxWidth: '500px' }}>
        <header className="page-header">
          <h1>Log In</h1>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/reset-password" className="btn-link">Forgot password?</Link>
            <Link to="/signup" className="btn-link">Create account</Link>
          </div>
        </form>
      </main>
    </>
  )
}
