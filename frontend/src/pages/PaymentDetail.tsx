import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || (user.role !== 'admin1' && user.role !== 'admin2')) {
      navigate('/login')
      return
    }
    if (id) {
      loadPayment()
    }
  }, [user, navigate, id])

  const loadPayment = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/admin/payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPayment(response.data.data.payment)
    } catch (error) {
      console.error('Error loading payment:', error)
      alert('Error loading payment details')
      navigate('/admin/payments')
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!confirm('Are you sure you want to process a refund for this payment?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `/api/admin/payments/${id}/refund`,
        { reason: 'Admin processed refund' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Refund processed successfully')
      loadPayment()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error processing refund')
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!payment) {
    return <div className="container mx-auto px-4 py-8">Payment not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/payments')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Payments
        </button>
        <h1 className="text-3xl font-bold">Payment Details</h1>
        <p className="text-gray-500">Payment ID: {id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Payment Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Transaction ID</label>
              <p className="font-mono font-bold text-lg">
                {payment.transactionId || 'Pending'}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600">Status</label>
              <p>
                <span
                  className={`px-3 py-1 rounded text-sm font-semibold ${
                    payment.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : payment.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : payment.status === 'refunded'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {payment.status.toUpperCase()}
                </span>
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600">Amount</label>
              <p className="font-bold text-green-600 text-3xl">
                ${payment.amount || '0.00'} {payment.currency}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600">Payment Method</label>
              <p className="font-semibold capitalize">
                {payment.paymentMethod.replace('_', ' ')}
              </p>
            </div>

            {payment.cardDetails && (
              <div>
                <label className="text-sm text-gray-600">Card Information</label>
                <p className="font-semibold">
                  {payment.cardDetails.cardType} ending in {payment.cardDetails.lastFourDigits}
                </p>
                <p className="text-sm text-gray-600">
                  Expires: {payment.cardDetails.expiryMonth}/{payment.cardDetails.expiryYear}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600">Created At</label>
              <p className="font-semibold">
                {new Date(payment.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {payment.paymentDate && (
              <div>
                <label className="text-sm text-gray-600">Payment Completed</label>
                <p className="font-semibold text-green-600">
                  {new Date(payment.paymentDate).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            {payment.refundDate && (
              <div className="border-t pt-4">
                <label className="text-sm text-purple-600">Refund Information</label>
                <p className="font-semibold">
                  Refunded: ${payment.refundAmount || '0.00'}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(payment.refundDate).toLocaleString()}
                </p>
              </div>
            )}

            {payment.failureReason && (
              <div className="border-t pt-4">
                <label className="text-sm text-red-600">Failure/Refund Reason</label>
                <p className="text-red-600">{payment.failureReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer & Order Information */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Customer Information</h2>
            
            <div
              className="cursor-pointer hover:bg-gray-50 p-3 rounded"
              onClick={() => navigate(`/admin/users/${payment.userId._id}`)}
            >
              <p className="font-semibold text-blue-600">
                {payment.userId.firstName} {payment.userId.lastName}
              </p>
              <p className="text-sm text-gray-600">{payment.userId.email}</p>
              {payment.userId.phone && (
                <p className="text-sm text-gray-600">{payment.userId.phone}</p>
              )}
              <p className="text-xs text-blue-500 mt-2">Click to view user profile →</p>
            </div>
          </div>

          {/* Order Info */}
          {payment.orderId && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Order Information</h2>
              
              <div>
                <label className="text-sm text-gray-600">Order Number</label>
                <p className="font-mono font-bold">{payment.orderId.orderNumber}</p>
              </div>

              <div className="mt-3">
                <label className="text-sm text-gray-600">Order Total</label>
                <p className="font-bold text-lg">${payment.orderId.totalAmount || '0.00'}</p>
              </div>

              <div className="mt-3">
                <label className="text-sm text-gray-600">Order Status</label>
                <p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      payment.orderId.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : payment.orderId.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {payment.orderId.status}
                  </span>
                </p>
              </div>

              <button
                onClick={() => navigate(`/admin/orders`)}
                className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
              >
                View order details →
              </button>
            </div>
          )}

          {/* Billing Address */}
          {payment.billingAddress && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Billing Address</h2>
              <p>{payment.billingAddress.street}</p>
              <p>
                {payment.billingAddress.city}, {payment.billingAddress.state}{' '}
                {payment.billingAddress.zipCode}
              </p>
              <p>{payment.billingAddress.country}</p>
            </div>
          )}

          {/* Actions */}
          {user?.role === 'admin2' && payment.status === 'completed' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Actions</h2>
              <button
                onClick={handleRefund}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded hover:bg-purple-700 font-semibold"
              >
                Process Refund
              </button>
              <p className="text-xs text-gray-500 mt-2">
                This will refund ${payment.amount || '0.00'} to the customer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
