import axios from './axios'

const API_URL = '/api/admin'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

export const adminService = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string; includeDeleted?: boolean }) => {
    const response = await axios.get(`${API_URL}/users`, { ...getAuthHeaders(), params })
    return response.data
  },

  getUserById: async (id: string) => {
    const response = await axios.get(`${API_URL}/users/${id}`, getAuthHeaders())
    return response
  },

  updateUser: async (id: string, data: any) => {
    const response = await axios.put(`${API_URL}/users/${id}`, data, getAuthHeaders())
    return response.data
  },

  deleteUser: async (id: string) => {
    const response = await axios.delete(`${API_URL}/users/${id}`, getAuthHeaders())
    return response.data
  },

  restoreUser: async (id: string) => {
    const response = await axios.post(`${API_URL}/users/${id}/restore`, {}, getAuthHeaders())
    return response.data
  },

  banUser: async (id: string, reason: string) => {
    const response = await axios.post(`${API_URL}/users/${id}/ban`, { reason }, getAuthHeaders())
    return response.data
  },

  unbanUser: async (id: string) => {
    const response = await axios.post(`${API_URL}/users/${id}/unban`, {}, getAuthHeaders())
    return response.data
  },

  getProducts: async (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string; includeDeleted?: boolean }) => {
    const response = await axios.get(`${API_URL}/products`, { ...getAuthHeaders(), params })
    return response.data
  },

  getProductById: async (id: string) => {
    const response = await axios.get(`${API_URL}/products/${id}`, getAuthHeaders())
    return response
  },

  updateProduct: async (id: string, data: any) => {
    const response = await axios.put(`${API_URL}/products/${id}`, data, getAuthHeaders())
    return response.data
  },

  deleteProduct: async (id: string) => {
    const response = await axios.delete(`${API_URL}/products/${id}`, getAuthHeaders())
    return response.data
  },

  restoreProduct: async (id: string) => {
    const response = await axios.post(`${API_URL}/products/${id}/restore`, {}, getAuthHeaders())
    return response.data
  },

  getOrders: async (params?: { page?: number; limit?: number; status?: string; search?: string; includeDeleted?: boolean }) => {
    const response = await axios.get(`${API_URL}/orders`, { ...getAuthHeaders(), params })
    return response.data
  },

  updateOrder: async (id: string, data: { status?: string; items?: any[]; totalAmount?: number }) => {
    const response = await axios.put(`${API_URL}/orders/${id}`, data, getAuthHeaders())
    return response.data
  },

  deleteOrder: async (id: string) => {
    const response = await axios.delete(`${API_URL}/orders/${id}`, getAuthHeaders())
    return response.data
  },

  restoreOrder: async (id: string) => {
    const response = await axios.post(`${API_URL}/orders/${id}/restore`, {}, getAuthHeaders())
    return response.data
  },

  getCategories: async (params?: { includeDeleted?: boolean }) => {
    const response = await axios.get(`${API_URL}/categories`, { ...getAuthHeaders(), params })
    return response.data
  },

  createCategory: async (data: { name: string; description?: string; icon?: string }) => {
    const response = await axios.post(`${API_URL}/categories`, data, getAuthHeaders())
    return response.data
  },

  updateCategory: async (id: string, data: any) => {
    const response = await axios.put(`${API_URL}/categories/${id}`, data, getAuthHeaders())
    return response.data
  },

  deleteCategory: async (id: string) => {
    const response = await axios.delete(`${API_URL}/categories/${id}`, getAuthHeaders())
    return response.data
  },

  restoreCategory: async (id: string) => {
    const response = await axios.post(`${API_URL}/categories/${id}/restore`, {}, getAuthHeaders())
    return response.data
  },

  getCoupons: async () => {
    const response = await axios.get(`${API_URL}/coupons`, getAuthHeaders())
    return response.data
  },

  createCoupon: async (data: any) => {
    const response = await axios.post(`${API_URL}/coupons`, data, getAuthHeaders())
    return response.data
  },

  updateCoupon: async (id: string, data: any) => {
    const response = await axios.put(`${API_URL}/coupons/${id}`, data, getAuthHeaders())
    return response.data
  },

  deleteCoupon: async (id: string) => {
    const response = await axios.delete(`${API_URL}/coupons/${id}`, getAuthHeaders())
    return response.data
  },

  getReviews: async (params?: { page?: number; limit?: number; productId?: string }) => {
    const response = await axios.get(`${API_URL}/reviews`, { ...getAuthHeaders(), params })
    return response.data
  },

  updateReview: async (id: string, data: { comment?: string; rating?: number }) => {
    const response = await axios.put(`${API_URL}/reviews/${id}`, data, getAuthHeaders())
    return response.data
  },

  deleteReview: async (id: string) => {
    const response = await axios.delete(`${API_URL}/reviews/${id}`, getAuthHeaders())
    return response.data
  },

  restoreReview: async (id: string) => {
    const response = await axios.post(`${API_URL}/reviews/${id}/restore`, {}, getAuthHeaders())
    return response.data
  },

  getMessages: async (params?: { page?: number; limit?: number }) => {
    const response = await axios.get(`${API_URL}/messages`, { ...getAuthHeaders(), params })
    return response.data
  },

  deleteMessage: async (id: string) => {
    const response = await axios.delete(`${API_URL}/messages/${id}`, getAuthHeaders())
    return response.data
  },

  getPayments: async (params?: { page?: number; limit?: number; orderId?: string }) => {
    const response = await axios.get(`${API_URL}/payments`, { ...getAuthHeaders(), params })
    return response.data
  },

  updatePayment: async (id: string, data: { status?: string; failureReason?: string; billingAddress?: any; cardDetails?: any }) => {
    const response = await axios.put(`${API_URL}/payments/${id}`, data, getAuthHeaders())
    return response.data
  },

  getStats: async () => {
    const response = await axios.get(`${API_URL}/stats`, getAuthHeaders())
    return response.data
  },
}
