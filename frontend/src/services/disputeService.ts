import axios from './axios'

export const disputeService = {
  getDisputes: async () => {
    const response = await axios.get('/api/disputes')
    return response.data.data
  },

  getDispute: async (id: string) => {
    const response = await axios.get(`/api/disputes/${id}`)
    return response.data.data
  },

  createDispute: async (orderId: string, reason: string) => {
    const response = await axios.post('/api/disputes', { orderId, reason })
    return response.data.data
  },

  addMessage: async (disputeId: string, message: string) => {
    const response = await axios.post(`/api/disputes/${disputeId}/messages`, { message })
    return response.data.data
  },

  resolveDispute: async (disputeId: string, resolution: string) => {
    const response = await axios.put(`/api/disputes/${disputeId}/resolve`, { resolution })
    return response.data.data
  },

  closeDispute: async (disputeId: string) => {
    const response = await axios.put(`/api/disputes/${disputeId}/close`)
    return response.data.data
  },
}
