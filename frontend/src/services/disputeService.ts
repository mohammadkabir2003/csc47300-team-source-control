import axios from './axios'

export const disputeService = {
  // Get user's disputes
  getDisputes: async () => {
    const response = await axios.get('/api/disputes')
    return response.data.data
  },

  // Get dispute by ID
  getDispute: async (id: string) => {
    const response = await axios.get(`/api/disputes/${id}`)
    return response.data.data
  },

  // Create dispute
  createDispute: async (orderId: string, reason: string) => {
    const response = await axios.post('/api/disputes', { orderId, reason })
    return response.data.data
  },

  // Add message to dispute
  addMessage: async (disputeId: string, message: string) => {
    const response = await axios.post(`/api/disputes/${disputeId}/messages`, { message })
    return response.data.data
  },

  // Resolve dispute (admin only)
  resolveDispute: async (disputeId: string, resolution: string) => {
    const response = await axios.put(`/api/disputes/${disputeId}/resolve`, { resolution })
    return response.data.data
  },

  // Close dispute (admin only)
  closeDispute: async (disputeId: string) => {
    const response = await axios.put(`/api/disputes/${disputeId}/close`)
    return response.data.data
  },
}
