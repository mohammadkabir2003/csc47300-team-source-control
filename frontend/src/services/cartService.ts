import axios from './axios'
import { Cart, CartItem } from '../types'

const API_URL = '/api/cart'

class CartService {
  async getCart(): Promise<Cart> {
    try {
      const response = await axios.get(API_URL)
      const items = response.data.data?.items || []
      
      // Convert to Cart format (productId -> quantity)
      const cart: Cart = {}
      items.forEach((item: any) => {
        if (item.productId?._id) {
          cart[item.productId._id] = item.quantity
        }
      })
      return cart
    } catch (error) {
      console.error('Failed to load cart:', error)
      return {}
    }
  }

  async getCartItems(): Promise<CartItem[]> {
    try {
      const response = await axios.get(API_URL)
      const items = response.data.data?.items || []
      
      // Convert backend format to CartItem format
      return items.map((item: any) => ({
        id: item.productId?._id || item._id,
        product: item.productId ? {
          id: item.productId._id,
          title: item.productId.name,
          price: item.productId.price, // String price
          images: item.productId.images,
          status: item.productId.status
        } : null,
        quantity: item.quantity
      })).filter((item: CartItem) => item.product != null)
    } catch (error) {
      console.error('Failed to load cart items:', error)
      return []
    }
  }

  async addToCart(productId: string, quantity: number = 1): Promise<Cart> {
    try {
      await axios.post(`${API_URL}/items`, { productId, quantity })
      return await this.getCart()
    } catch (error) {
      console.error('Failed to add to cart:', error)
      throw error
    }
  }

  async removeFromCart(productId: string): Promise<Cart> {
    try {
      await axios.delete(`${API_URL}/items/${productId}`)
      return await this.getCart()
    } catch (error) {
      console.error('Failed to remove from cart:', error)
      throw error
    }
  }

  async updateQuantity(productId: string, quantity: number): Promise<Cart> {
    try {
      await axios.put(`${API_URL}/items/${productId}`, { quantity })
      return await this.getCart()
    } catch (error) {
      console.error('Failed to update cart:', error)
      throw error
    }
  }

  async clearCart(): Promise<void> {
    try {
      await axios.delete(API_URL)
    } catch (error) {
      console.error('Failed to clear cart:', error)
      throw error
    }
  }
}

export const cartService = new CartService()
