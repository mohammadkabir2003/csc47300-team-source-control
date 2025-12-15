import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { adminService } from '../services/adminService'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Modal from '../components/Modal'

export default function AdminProducts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [modal, setModal] = useState<{
    isOpen: boolean
    title?: string
    message: string
    type?: 'success' | 'error' | 'info' | 'warning'
    onConfirm?: () => void
  }>({
    isOpen: false,
    message: ''
  })

  useEffect(() => {
    if (!user || (user.role !== 'admin1' && user.role !== 'admin2')) {
      navigate('/login')
      return
    }
    loadProducts()
  }, [user, navigate, search, statusFilter, showDeleted])

  const loadProducts = async () => {
    try {
      const response = await adminService.getProducts({ search, status: statusFilter, includeDeleted: showDeleted })
      setProducts(response.data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProduct = async (productId: string, updates: any) => {
    try {
      await adminService.updateProduct(productId, updates)
      setEditingProduct(null)
      loadProducts()
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'Product updated successfully',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error updating product:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error updating product'
      setModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
        type: 'error'
      })
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this product?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await adminService.deleteProduct(productId)
          loadProducts()
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'Product deleted successfully',
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error deleting product:', error)
          const errorMessage = error.response?.data?.message || error.message || 'Error deleting product'
          setModal({
            isOpen: true,
            title: 'Error',
            message: errorMessage,
            type: 'error'
          })
        }
      }
    })
  }

  const handleRestoreProduct = async (productId: string, productTitle: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Restore',
      message: `Restore "${productTitle}"?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await adminService.restoreProduct(productId)
          loadProducts()
          setModal({
            isOpen: true,
            title: 'Success',
            message: `"${productTitle}" has been restored`,
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error restoring product:', error)
          const errorMessage = error.response?.data?.message || error.message || 'Error restoring product'
          setModal({
            isOpen: true,
            title: 'Error',
            message: errorMessage,
            type: 'error'
          })
        }
      }
    })
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'available':
        return { backgroundColor: 'var(--color-success)', color: 'white' }
      case 'sold':
        return { backgroundColor: 'var(--color-error)', color: 'white' }
      default:
        return { backgroundColor: 'var(--color-secondary)', color: 'white' }
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container">
          <p className="muted">Loading products...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="page-header">
          <h1>Manage Products</h1>
          <Link to="/admin" className="btn btn-ghost">← Back to Dashboard</Link>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
          {user?.role === 'admin2' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Show Deleted Products (Archive)</span>
              </label>
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid">
          {products.map((product) => (
            <div 
              key={product._id} 
              className="product-card"
              style={{
                background: product.isDeleted ? '#f3f4f6' : 'var(--color-surface)',
                opacity: product.isDeleted ? 0.7 : 1
              }}
            >
              {product.images?.[0] && (
                <img
                  src={`/api/uploads/image/${product.images[0]}`}
                  alt={product.name}
                  className="product-image"
                  onClick={() => navigate(`/admin/products/${product._id}`)}
                  style={{ cursor: 'pointer' }}
                />
              )}
              <div className="product-info">
                <h3 
                  className="product-title" 
                  onClick={() => navigate(`/admin/products/${product._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {product.name}
                  {product.isDeleted && <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontSize: '0.75rem' }}>(DELETED)</span>}
                </h3>
                <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {product.description?.substring(0, 60)}...
                </p>
                <p className="product-price">${product.price || '0.00'}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    ...getStatusStyle(product.status),
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {product.status}
                  </span>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>{product.category}</span>
                </div>

                <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span className="muted">Listed: </span>
                    <span style={{ fontWeight: 600 }}>{product.quantity ?? 0} units</span>
                  </div>
                  {product.availableQuantity !== undefined && (
                    <div>
                      <span className="muted">Available: </span>
                      <span style={{ 
                        fontWeight: 600,
                        color: (product.availableQuantity ?? 0) === 0 ? 'var(--color-error)' :
                               (product.availableQuantity ?? 0) < 5 ? 'var(--color-secondary)' :
                               'var(--color-success)'
                      }}>
                        {product.availableQuantity ?? 0} units
                      </span>
                      {product.quantity !== product.availableQuantity && (
                        <span className="muted" style={{ fontSize: '0.7rem' }}>
                          {' '}({product.quantity - product.availableQuantity} in orders)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <p className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  Seller: {product.sellerName}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => navigate(`/admin/products/${product._id}`)}
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1 }}
                  >
                    View Details & Reviews
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    Edit
                  </button>
                  {user?.role === 'admin2' && (
                    <>
                      {product.isDeleted ? (
                        <button
                          onClick={() => handleRestoreProduct(product._id, product.name)}
                          className="btn btn-sm"
                          style={{ flex: 1, backgroundColor: '#10b981', color: 'white' }}
                        >
                          ♻️ Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="btn btn-sm"
                          style={{ flex: 1, backgroundColor: 'var(--color-error)', color: 'white' }}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="muted">No products found</p>
          </div>
        )}

        {/* Edit Modal */}
        {editingProduct && (
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
            <div className="card" style={{ maxWidth: '500px', width: '100%', margin: '2rem auto' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Edit Product</h2>
              <form onSubmit={(e) => {
                e.preventDefault()
                handleUpdateProduct(editingProduct._id, editingProduct)
              }}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="textarea"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label>Total Inventory</label>
                  <input
                    type="number"
                    value={editingProduct.quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, quantity: parseInt(e.target.value) })}
                    className="input"
                    min="0"
                  />
                  <small className="muted" style={{ fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                    Adjust your total inventory count
                  </small>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                    className="input"
                  >
                    <option value="available">Available</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(m => ({ ...m, isOpen: false, onConfirm: undefined }))}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.onConfirm ? 'Yes, Confirm' : 'OK'}
        cancelText="Cancel"
      />
    </>
  )
}
