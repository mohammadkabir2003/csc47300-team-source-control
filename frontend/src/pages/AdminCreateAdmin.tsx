import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import Header from '../components/Header'

export default function AdminCreateAdmin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'admin1'
  })

  if (!user || user.role !== 'admin2') {
    navigate('/admin')
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setError('')
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      alert('Please fill in all required fields')
      return
    }

    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    if (!formData.email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        '/api/admin/create-admin',
        {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          role: formData.role
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      alert(`Admin user created successfully!\nEmail: ${response.data.admin.email}\nRole: ${response.data.admin.role}`)
      navigate('/admin/users')
    } catch (error: any) {
      console.error('Error creating admin:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)
      
      const errorMessage = error.response?.data?.message || error.message || 'Error creating admin user. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Create Admin User</h1>
            <p className="muted">Only Admin2 users can create new admin accounts</p>
          </div>
          <Link to="/admin/users" className="btn btn-ghost">← Back to Users</Link>
        </div>

        {error && (
          <div className="alert alert-error" style={{ maxWidth: '600px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div className="card" style={{ maxWidth: '600px' }}>
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">
                Email Address <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="admin@ccny.cuny.edu"
                required
              />
              <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Recommended: Use @ccny.cuny.edu email</p>
            </div>

            {/* First Name */}
            <div className="form-group">
              <label htmlFor="firstName">
                First Name <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label htmlFor="lastName">
                Last Name <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            {/* Phone (optional) */}
            <div className="form-group">
              <label htmlFor="phone">Phone Number (optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="(123) 456-7890"
              />
            </div>

            {/* Admin Level Selection */}
            <div className="form-group">
              <label htmlFor="role">
                Admin Level <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="admin1">Admin Level 1</option>
                <option value="admin2">Admin Level 2</option>
              </select>
            </div>

            {/* Permission Details Cards */}
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Admin1 Card */}
              <div style={{ 
                padding: '1rem', 
                backgroundColor: formData.role === 'admin1' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface)', 
                borderRadius: 'var(--radius)',
                border: formData.role === 'admin1' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                transition: 'all 0.2s'
              }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                  Admin Level 1 Permissions:
                </p>
                <ul style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--color-text)' }}>
                  <li>✅ Create, Read, and Update operations</li>
                  <li>✅ Manage products and orders</li>
                  <li>✅ View user accounts</li>
                  <li>✅ Handle disputes and reviews</li>
                  <li>❌ Cannot delete records</li>
                  <li>❌ Cannot restore deleted records</li>
                  <li>❌ Cannot create admin accounts</li>
                </ul>
              </div>

              {/* Admin2 Card */}
              <div style={{ 
                padding: '1rem', 
                backgroundColor: formData.role === 'admin2' ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface)', 
                borderRadius: 'var(--radius)',
                border: formData.role === 'admin2' ? '2px solid var(--color-error)' : '1px solid var(--color-border)',
                transition: 'all 0.2s'
              }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-error)', marginBottom: '0.5rem' }}>
                  Admin Level 2 Permissions:
                </p>
                <ul style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--color-text)' }}>
                  <li>✅ Full CRUD operations (Create, Read, Update, Delete)</li>
                  <li>✅ Create new admin accounts (admin1 or admin2)</li>
                  <li>✅ Promote users to admin1</li>
                  <li>✅ View deleted records</li>
                  <li>✅ Restore deleted records</li>
                  <li>✅ Complete system access</li>
                </ul>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">
                Password <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                minLength={8}
                required
              />
              <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm Password <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            {/* Warning */}
            {formData.role === 'admin2' && (
              <div className="alert" style={{ 
                backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                border: '1px solid var(--color-secondary)',
                marginBottom: '1.5rem'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  ⚠️ <strong>Important:</strong> Admin Level 2 has full system access including the ability to delete records and create other admins. Use with caution.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ flex: 1, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Creating Admin...' : `Create ${formData.role === 'admin1' ? 'Admin Level 1' : 'Admin Level 2'}`}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
