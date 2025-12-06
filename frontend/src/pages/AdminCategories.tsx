import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { adminService } from '../services/adminService'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Modal from '../components/Modal'

export default function AdminCategories() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', description: '', icon: '' })
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
    loadCategories()
  }, [user, navigate, showDeleted])

  const loadCategories = async () => {
    try {
      const response = await adminService.getCategories({ includeDeleted: showDeleted })
      setCategories(response.data)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminService.createCategory(newCategory)
      setIsCreating(false)
      setNewCategory({ name: '', description: '', icon: '' })
      loadCategories()
      alert('Category created successfully')
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Error creating category')
    }
  }

  const handleUpdateCategory = async (categoryId: string, updates: any) => {
    try {
      await adminService.updateCategory(categoryId, updates)
      setEditingCategory(null)
      loadCategories()
      alert('Category updated successfully')
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Error updating category')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      await adminService.deleteCategory(categoryId)
      loadCategories()
      alert('Category deleted successfully')
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Error deleting category')
    }
  }

  const handleRestoreCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Restore category "${categoryName}"?`)) return

    try {
      await adminService.restoreCategory(categoryId)
      loadCategories()
      alert(`Category "${categoryName}" has been restored`)
    } catch (error) {
      console.error('Error restoring category:', error)
      alert('Error restoring category')
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container">
          <p className="muted">Loading categories...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="page-header">
          <h1>Manage Categories</h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setIsCreating(true)}
              className="btn btn-primary"
            >
              + Create Category
            </button>
            <Link to="/admin" className="btn btn-ghost">← Back to Dashboard</Link>
          </div>
        </div>

        {/* Show Deleted Checkbox */}
        {user?.role === 'admin2' && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Show Deleted Categories (Archive)</span>
            </label>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid">
          {categories.map((category) => (
            <div 
              key={category._id} 
              className="card"
              style={{
                background: category.isDeleted ? '#f3f4f6' : 'var(--color-surface)',
                opacity: category.isDeleted ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                {category.icon && <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>{category.icon}</span>}
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                    {category.name}
                    {category.isDeleted && <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontSize: '0.75rem' }}>(DELETED)</span>}
                  </h3>
                  <p className="muted" style={{ fontSize: '0.875rem' }}>{category.slug}</p>
                </div>
              </div>
              
              <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                {category.description || 'No description'}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="muted" style={{ fontSize: '0.875rem' }}>{category.productCount} products</span>
                <span className="muted" style={{ fontSize: '0.75rem' }}>
                  {new Date(category.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setEditingCategory(category)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  Edit
                </button>
                {user?.role === 'admin2' && (
                  <>
                    {category.isDeleted ? (
                      <button
                        onClick={() => handleRestoreCategory(category._id, category.name)}
                        className="btn btn-sm"
                        style={{ flex: 1, backgroundColor: '#10b981', color: 'white' }}
                      >
                        ♻️ Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteCategory(category._id)}
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
          ))}
        </div>

        {categories.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="muted">No categories found</p>
            <button
              onClick={() => setIsCreating(true)}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              Create Your First Category
            </button>
          </div>
        )}

        {/* Create Modal */}
        {isCreating && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000
          }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Create Category</h2>
              <form onSubmit={handleCreateCategory}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    required
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Electronics"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="textarea"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>

                <div className="form-group">
                  <label>Icon (emoji)</label>
                  <input
                    type="text"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    className="input"
                    placeholder="📱"
                    maxLength={2}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false)
                      setNewCategory({ name: '', description: '', icon: '' })
                    }}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingCategory && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000
          }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Edit Category</h2>
              <form onSubmit={(e) => {
                e.preventDefault()
                handleUpdateCategory(editingCategory._id, editingCategory)
              }}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editingCategory.description}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                    className="textarea"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Icon (emoji)</label>
                  <input
                    type="text"
                    value={editingCategory.icon}
                    onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                    className="input"
                    maxLength={2}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
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
    </>
  )
}
