import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('What is your favorite color?')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!securityAnswer || securityAnswer.trim().length < 2) {
      setError('Security answer must be at least 2 characters')
      return
    }

    setLoading(true)

    try {
      await signup(email, password, firstName, lastName, securityQuestion, securityAnswer)
      navigate('/market')
    } catch (err: any) {
      console.error('Signup error:', err)
      console.error('Error response:', err.response)
      console.error('Error data:', err.response?.data)
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create account'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      
      <main className="container" style={{ maxWidth: '500px' }}>
        <header className="page-header">
          <h1>Sign Up</h1>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              className="input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              className="input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

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
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="securityQuestion">Security Question (for password reset)</label>
            <select
              id="securityQuestion"
              className="input"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              required
            >
              <option value="What is your favorite color?">What is your favorite color?</option>
              <option value="What city were you born in?">What city were you born in?</option>
              <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
              <option value="What was your first pet's name?">What was your first pet's name?</option>
              <option value="What is your favorite food?">What is your favorite food?</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="securityAnswer">Security Answer</label>
            <input
              id="securityAnswer"
              type="text"
              className="input"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Answer to your security question"
              required
              minLength={2}
            />
            <p className="muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              You'll need this to reset your password
            </p>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link to="/login" className="btn-link">Already have an account? Log in</Link>
          </div>
        </form>
      </main>
    </>
  )
}
