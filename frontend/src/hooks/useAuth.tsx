import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setToken, getToken, ApiError } from '../services/api'
import type { AuthResponse, User } from '../types'

export type Role = 'ADMIN' | 'CONDUCTOR'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  hasRole: () => false,
})

function decodeRole(token: string): Role {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role as Role
  } catch {
    return 'CONDUCTOR'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (token) {
      const role = decodeRole(token)
      const stored = localStorage.getItem('user')
      if (stored) {
        try {
          setUser(JSON.parse(stored))
          setLoading(false)
          return
        } catch {
          /* ignore */
        }
      }
      // lightweight bootstrap using the token role
      setUser({ id: '', name: 'User', email: '', role })
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post<{ data: AuthResponse }>('/auth/login', { email, password })
    setToken(res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('user')
    setUser(null)
  }

  const hasRole = (...roles: Role[]) => user !== null && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function isUnauthorized(err: unknown) {
  return err instanceof ApiError && (err.status === 401 || err.status === 403)
}
