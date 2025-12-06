import axios from './axios'
import { Product, DBProduct } from '../types'

const API_URL = '/api'

class ProductService {
  async getProducts(filters?: {
    category?: string
    search?: string
    sort?: string
  }): Promise<Product[]> {
    const response = await axios.get(`${API_URL}/products`, { params: filters })
    return response.data.data || []
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const response = await axios.get(`${API_URL}/products/${id}`)
      return response.data.data
    } catch (error) {
      return null
    }
  }

  async createProduct(product: Partial<DBProduct>): Promise<Product> {
    const response = await axios.post(`${API_URL}/products`, product)
    return response.data.data
  }

  async updateProduct(id: string, updates: Partial<DBProduct>): Promise<Product> {
    const response = await axios.put(`${API_URL}/products/${id}`, updates)
    return response.data.data
  }

  async deleteProduct(id: string): Promise<void> {
    await axios.delete(`${API_URL}/products/${id}`)
  }

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('image', file)
    
    const response = await axios.post(`${API_URL}/uploads/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    })
    return response.data.data.fileId
  }

  async uploadImages(files: File[]): Promise<string[]> {
    const formData = new FormData()
    files.forEach(file => formData.append('images', file))
    
    const response = await axios.post(`${API_URL}/uploads/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    })
    return response.data.data.map((item: any) => item.fileId)
  }

  async getCategories(): Promise<string[]> {
    const response = await axios.get(`${API_URL}/categories`)
    return response.data.categories || []
  }
}

export const productService = new ProductService()
