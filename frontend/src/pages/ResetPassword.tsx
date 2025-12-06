import { useState } from 'react'
import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'email' | 'security' | 'password'>('email')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { getSecurityQuestion, resetPasswordWithSecurity } = useAuth()
  const navigate = useNavigate()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const question = await getSecurityQuestion(email)
      setSecurityQuestion(question)
      setStep('security')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email not found')
    } finally {
      setLoading(false)
    }
  }

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await resetPasswordWithSecurity(email, securityAnswer, newPassword)
      setSuccess('Password reset successfully! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid security answer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      
      <main className="container" style={{ maxWidth: '500px' }}>
        <header className="page-header">
          <h1>Reset Password</h1>
          <p className="muted">
            {step === 'email' && 'Enter your email to get started'}
            {step === 'security' && 'Answer your security question'}
          </p>
        </header>

                {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit}>
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

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Checking...' : 'Continue'}
            </button>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link to="/login" className="btn-link">Back to login</Link>
            </div>
          </form>
        )}

        {step === 'security' && (
          <form onSubmit={handleSecuritySubmit}>
            <div className="form-group">
              <label>Security Question</label>
              <p style={{ 
                padding: '0.75rem', 
                background: 'var(--color-surface)', 
                borderRadius: '8px',
                fontWeight: 500
              }}>
                {securityQuestion}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="securityAnswer">Your Answer</label>
              <input
                id="securityAnswer"
                type="text"
                className="input"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Enter your answer"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
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
                placeholder="Repeat password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => setStep('email')} 
                className="btn-link"
              >
                Use different email
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  )
}
