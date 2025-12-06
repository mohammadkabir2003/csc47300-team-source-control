import axios from './axios'
import { DBOrder } from '../types'

const API_URL = '/api'

class OrderService {
  async getOrders(): Promise<DBOrder[]> {
    try {
      const response = await axios.get(`${API_URL}/orders`)
      return response.data.data || []
    } catch (error) {
      return []
    }
  }

  async getOrder(id: string): Promise<DBOrder | null> {
    try {
      const response = await axios.get(`${API_URL}/orders/${id}`)
      return response.data.order
    } catch (error) {
      return null
    }
  }

  async createOrder(
    items: Array<{ productId: string; quantity: number }>,
    billingAddress: any,
    paymentMethod: string,
    cardLastFour: string
  ): Promise<DBOrder> {
    const response = await axios.post(`${API_URL}/orders`, { 
      items,
      shippingAddress: billingAddress, // Using billing as shipping for pickup
      billingAddress,
      paymentMethod,
      cardLastFour
    })
    return response.data.order
  }

  async buyerConfirm(orderId: string): Promise<any> {
    const response = await axios.put(`${API_URL}/orders/${orderId}/buyer-confirm`)
    return response.data.data
  }

  async sellerConfirm(orderId: string): Promise<any> {
    const response = await axios.put(`${API_URL}/orders/${orderId}/seller-confirm`)
    return response.data.data
  }

  async getSellerOrders(): Promise<any[]> {
    try {
      const response = await axios.get(`${API_URL}/orders/seller/my-orders`)
      return response.data.data || []
    } catch (error) {
      return []
    }
  }

  async cancelOrder(orderId: string): Promise<any> {
    const response = await axios.put(`${API_URL}/orders/${orderId}/cancel`)
    return response.data.data
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    const response = await axios.put(`${API_URL}/orders/${orderId}/status`, { status })
    return response.data.data
  }

  async createDispute(orderId: string, reason: string): Promise<any> {
    const response = await axios.post(`${API_URL}/disputes`, { orderId, reason })
    return response.data.data
  }
}

export const orderService = new OrderService()
