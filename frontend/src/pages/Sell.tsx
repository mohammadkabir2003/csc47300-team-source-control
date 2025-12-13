import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { productService } from '../services/productService'

export default function Sell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])
  
  if (!user) {
    return (
      <>
        <Header />
        <div className="container" style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p className="muted">Redirecting to login...</p>
        </div>
      </>
    )
  }

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    condition: 'New',
    location: '',
    quantity: '1',
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + selectedFiles.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }
    
    setSelectedFiles(prev => [...prev, ...files])
    
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!user) {
      setError('You must be logged in to sell items')
      setLoading(false)
      return
    }

    try {
      
      let imageIds: string[] = []
      if (selectedFiles.length > 0) {
        imageIds = await productService.uploadImages(selectedFiles)
      }

      await productService.createProduct({
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price).toFixed(2),
        category: formData.category,
        condition: formData.condition,
        campus: formData.location,
        quantity: parseInt(formData.quantity),
        seller_id: user.id.toString(),
        is_active: true,
        images: imageIds,
        quantity_sold: 0,
        created_at: new Date().toISOString(),
        id: ''
      })

      setSuccess(true)
      setTimeout(() => navigate('/market'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create listing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      
      <main className="container" style={{ maxWidth: '600px' }}>
        <header className="page-header">
          <h1>Sell an Item</h1>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Listing created! Redirecting...</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Item Name *</label>
            <input
              id="name"
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="textarea"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price ($) *</label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              className="input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">Select a category</option>
              <option value="Textbooks">Textbooks</option>
              <option value="Electronics">Electronics</option>
              <option value="Furniture">Furniture</option>
              <option value="Clothing">Clothing</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="condition">Condition *</label>
            <select
              id="condition"
              className="input"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              required
            >
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location *</label>
            <input
              id="location"
              type="text"
              className="input"
              placeholder="e.g., NAC Building"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              id="quantity"
              type="number"
              min="1"
              className="input"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="images">Product Images (Max 5)</label>
            <input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="input"
            />
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Upload up to 5 images (JPG, PNG, GIF - Max 5MB each)
            </small>
            
            {previewUrls.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {previewUrls.map((url, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`}
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating listing...' : 'Create Listing'}
          </button>
        </form>
      </main>
    </>
  )
}
