import { useState, useEffect } from 'react'
import Header from '../components/Header'
import ProductCard from '../components/ProductCard'
import { Product } from '../types'
import { productService } from '../services/productService'

export default function Market() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [search, category, sort])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await productService.getProducts({ search, category, sort })
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const cats = await productService.getCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  return (
    <>
      <Header />
      
      <main id="main" className="container">
        <header className="page-header">
          <h1>Browse Listings</h1>
          <p className="muted">Find textbooks, electronics, and more from CCNY students</p>
        </header>

        <form className="toolbar" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            id="q"
            className="input"
            type="search"
            placeholder="Search textbooks, electronics, dorm items…"
            aria-label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            id="category"
            className="input"
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            id="sort"
            className="input"
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Lowest Price</option>
            <option value="price-desc">Highest Price</option>
          </select>
        </form>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '1rem' }} className="muted">
            No results — try a different search or reset filters.
          </div>
        ) : (
          <section id="results" className="grid" aria-live="polite">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        )}
      </main>
    </>
  )
}
