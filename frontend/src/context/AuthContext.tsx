import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserSession } from '../types'
import { authService } from '../services/authService'

interface AuthContextType {
  user: UserSession | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, firstName: string, lastName: string, securityQuestion?: string, securityAnswer?: string) => Promise<void>
  logout: () => void
  getSecurityQuestion: (email: string) => Promise<string>
  resetPasswordWithSecurity: (email: string, securityAnswer: string, newPassword: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const session = await authService.getSession()
      setUser(session)
    } catch (error) {
      console.error('Failed to check session:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const session = await authService.login(email, password)
    setUser(session)
  }

  const signup = async (email: string, password: string, firstName: string, lastName: string, securityQuestion?: string, securityAnswer?: string) => {
    const session = await authService.signup(email, password, firstName, lastName, securityQuestion, securityAnswer)
    setUser(session)
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    window.location.href = '/login'
  }

  const getSecurityQuestion = async (email: string) => {
    return await authService.getSecurityQuestion(email)
  }

  const resetPasswordWithSecurity = async (email: string, securityAnswer: string, newPassword: string) => {
    await authService.resetPasswordWithSecurity(email, securityAnswer, newPassword)
  }

  const updatePassword = async (newPassword: string) => {
    await authService.updatePassword(newPassword)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, getSecurityQuestion, resetPasswordWithSecurity, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
