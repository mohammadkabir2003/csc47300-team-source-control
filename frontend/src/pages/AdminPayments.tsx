import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

export default function AdminPayments() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<any>(null)

  useEffect(() => {
    if (!user || (user.role !== 'admin1' && user.role !== 'admin2')) {
      navigate('/login')
      return
    }
    loadPayments()
  }, [user, navigate, statusFilter])

  const loadPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: statusFilter },
      })
      setPayments(response.data.data.payments)
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (paymentId: string) => {
    if (!confirm('Are you sure you want to process a refund for this payment?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `/api/admin/payments/${paymentId}/refund`,
        { reason: 'Admin processed refund' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Refund processed successfully')
      loadPayments()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error processing refund')
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { backgroundColor: 'var(--color-success)', color: 'white' }
      case 'failed':
        return { backgroundColor: 'var(--color-error)', color: 'white' }
      case 'refunded':
        return { backgroundColor: 'var(--color-primary)', color: 'white' }
      default:
        return { backgroundColor: 'var(--color-secondary)', color: 'white' }
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container">
          <p className="muted">Loading payments...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="page-header">
          <h1>Manage Payments</h1>
          <Link to="/admin" className="btn btn-ghost">← Back to Dashboard</Link>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0, maxWidth: '300px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Transaction ID</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>User</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Order #</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Amount</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Method</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr 
                  key={payment._id} 
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/payments/${payment._id}`)}
                >
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {payment.transactionId || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                    {payment.userId?.firstName} {payment.userId?.lastName}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {payment.orderId?.orderNumber || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-success)' }}>
                    ${payment.amount || '0.00'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                    {payment.paymentMethod.replace('_', ' ')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      ...getStatusStyle(payment.status),
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {payment.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }} className="muted">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="btn btn-sm btn-primary"
                      style={{ marginRight: '0.5rem' }}
                    >
                      View
                    </button>
                    {user?.role === 'admin2' && payment.status === 'completed' && (
                      <button
                        onClick={() => handleRefund(payment._id)}
                        className="btn btn-sm"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p className="muted">No payments found</p>
            </div>
          )}
        </div>

        {/* Payment Detail Modal */}
        {selectedPayment && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
            overflow: 'auto'
          }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', margin: '2rem auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Payment Details</h2>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '1.5rem', lineHeight: 1, padding: '0.25rem 0.5rem' }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="muted" style={{ fontSize: '0.875rem' }}>Transaction ID</label>
                  <p style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {selectedPayment.transactionId || 'N/A'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '0.875rem' }}>Amount</label>
                    <p style={{ fontWeight: 600, color: 'var(--color-success)', fontSize: '1.25rem' }}>
                      ${selectedPayment.amount || '0.00'}
                    </p>
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '0.875rem' }}>Status</label>
                    <p>
                      <span style={{
                        ...getStatusStyle(selectedPayment.status),
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {selectedPayment.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="muted" style={{ fontSize: '0.875rem' }}>Payment Method</label>
                  <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {selectedPayment.paymentMethod.replace('_', ' ')}
                  </p>
                </div>

                {selectedPayment.cardDetails && (
                  <div>
                    <label className="muted" style={{ fontSize: '0.875rem' }}>Card Details</label>
                    <p style={{ fontWeight: 600 }}>
                      {selectedPayment.cardDetails.cardType} •••• {selectedPayment.cardDetails.lastFourDigits}
                    </p>
                  </div>
                )}

                <div>
                  <label className="muted" style={{ fontSize: '0.875rem' }}>Customer</label>
                  <p style={{ fontWeight: 600 }}>
                    {selectedPayment.userId?.firstName} {selectedPayment.userId?.lastName}
                  </p>
                  <p className="muted" style={{ fontSize: '0.875rem' }}>{selectedPayment.userId?.email}</p>
                </div>

                {selectedPayment.failureReason && (
                  <div>
                    <label style={{ fontSize: '0.875rem', color: 'var(--color-error)' }}>Failure Reason</label>
                    <p style={{ color: 'var(--color-error)' }}>{selectedPayment.failureReason}</p>
                  </div>
                )}

                <div>
                  <label className="muted" style={{ fontSize: '0.875rem' }}>Created At</label>
                  <p style={{ fontWeight: 600 }}>
                    {new Date(selectedPayment.createdAt).toLocaleString()}
                  </p>
                </div>

                {selectedPayment.paymentDate && (
                  <div>
                    <label className="muted" style={{ fontSize: '0.875rem' }}>Payment Date</label>
                    <p style={{ fontWeight: 600 }}>
                      {new Date(selectedPayment.paymentDate).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedPayment.refundDate && (
                  <div>
                    <label className="muted" style={{ fontSize: '0.875rem' }}>Refund Date</label>
                    <p style={{ fontWeight: 600 }}>
                      {new Date(selectedPayment.refundDate).toLocaleString()}
                    </p>
                    <p className="muted" style={{ fontSize: '0.875rem' }}>
                      Amount: ${selectedPayment.refundAmount || '0.00'}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedPayment(null)} className="btn btn-ghost">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
