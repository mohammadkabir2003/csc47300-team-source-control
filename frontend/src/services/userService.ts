import axios from './axios'

export const userService = {
  // Public endpoint to get a user's public profile and history
  getUserById: async (id: string) => {
    const response = await axios.get(`/api/users/${id}`)
    return response.data
  }
}

export default userService
