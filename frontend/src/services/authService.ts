import axios from './axios'
import { UserSession } from '../types'

const API_URL = '/api'

class AuthService {
  async login(email: string, password: string): Promise<UserSession> {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data.user
  }

  async signup(email: string, password: string, firstName: string, lastName: string, securityQuestion?: string, securityAnswer?: string): Promise<UserSession> {
    const response = await axios.post(`${API_URL}/auth/signup`, { 
      email, 
      password, 
      firstName, 
      lastName,
      securityQuestion,
      securityAnswer
    })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data.user
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token')
    await axios.post(`${API_URL}/auth/logout`)
  }

  async getSession(): Promise<UserSession | null> {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        return null
      }
      
      const response = await axios.get(`${API_URL}/auth/session`)
      return response.data.user || null
    } catch (error) {
      localStorage.removeItem('token')
      return null
    }
  }

  async getSecurityQuestion(email: string): Promise<string> {
    const response = await axios.post(`${API_URL}/auth/reset-password/question`, { email })
    return response.data.data.securityQuestion
  }

  async resetPasswordWithSecurity(email: string, securityAnswer: string, newPassword: string): Promise<void> {
    await axios.post(`${API_URL}/auth/reset-password`, { email, securityAnswer, newPassword })
  }

  async updatePassword(newPassword: string): Promise<void> {
    await axios.post(`${API_URL}/auth/update-password`, { newPassword })
  }
}

export const authService = new AuthService()
