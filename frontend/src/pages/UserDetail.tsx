import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminService } from '../services/adminService'
import { useAuth } from '../context/AuthContext'

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || (user.role !== 'admin1' && user.role !== 'admin2')) {
      navigate('/login')
      return
    }
    if (id) {
      loadUserData()
    }
  }, [user, navigate, id])

  const loadUserData = async () => {
    try {
      const response = await adminService.getUserById(id!)
      setUserData(response.data)
    } catch (error) {
      console.error('Error loading user:', error)
      alert('Error loading user details')
      navigate('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!userData) {
    return <div className="container mx-auto px-4 py-8">User not found</div>
  }

  const { user: userProfile, history } = userData

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Users
        </button>
        <h1 className="text-3xl font-bold">User Profile</h1>
        <p className="text-gray-500">User ID: {id}</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <p className="font-semibold">{userProfile.firstName} {userProfile.lastName}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <p className="font-semibold">{userProfile.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Phone</label>
            <p className="font-semibold">{userProfile.phone || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Role</label>
            <p>
              <span className={`px-3 py-1 rounded text-sm font-semibold ${
                userProfile.role === 'admin2' ? 'bg-red-100 text-red-800' :
                userProfile.role === 'admin1' ? 'bg-orange-100 text-orange-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {userProfile.role}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Email Verified</label>
            <p>{userProfile.isEmailVerified ? '✅ Yes' : '❌ No'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Member Since</label>
            <p className="font-semibold">
              {new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          {userProfile.isDeleted && (
            <div className="md:col-span-2">
              <label className="text-sm text-red-600">Status</label>
              <p className="text-red-600 font-semibold">
                🗑️ DELETED on {new Date(userProfile.deletedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm text-blue-600 font-medium">Total Products</h3>
          <p className="text-2xl font-bold text-blue-900">{history.totalProducts}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm text-green-600 font-medium">Total Orders</h3>
          <p className="text-2xl font-bold text-green-900">{history.totalOrders}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-sm text-purple-600 font-medium">Total Spent</h3>
          <p className="text-2xl font-bold text-purple-900">${history.totalSpent || '0.00'}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm text-yellow-600 font-medium">Reviews Written</h3>
          <p className="text-2xl font-bold text-yellow-900">{history.totalReviews}</p>
        </div>
      </div>

      {/* Products Listed */}
      {history.products.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Products Listed ({history.products.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.products.map((product: any) => (
              <div
                key={product._id}
                className="border rounded-lg p-3 hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/admin/products/${product._id}`)}
              >
                {product.images?.[0] && (
                  <img src={product.images[0]} alt={product.name} className="w-full h-32 object-cover rounded mb-2" />
                )}
                <h3 className="font-semibold truncate">{product.name}</h3>
                <p className="text-green-600 font-bold">${product.price}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    product.status === 'available' ? 'bg-green-100 text-green-800' :
                    product.status === 'sold' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {product.status}
                  </span>
                  {product.isDeleted && (
                    <span className="text-xs text-red-600">🗑️ Deleted</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History */}
      {history.orders.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Order History ({history.orders.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Order #</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Items</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Total</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.orders.map((order: any) => (
                  <tr key={order._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{order.items.length} items</td>
                    <td className="px-4 py-3 text-sm font-bold">${order.totalAmount || '0.00'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                      {order.isDeleted && (
                        <span className="ml-2 text-xs text-red-600">🗑️</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews */}
      {history.reviews.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Reviews Written ({history.reviews.length})</h2>
          <div className="space-y-3">
            {history.reviews.map((review: any) => (
              <div key={review._id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center mb-1">
                  <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                  <span className="text-gray-400 ml-1">{'⭐'.repeat(5 - review.rating)}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
