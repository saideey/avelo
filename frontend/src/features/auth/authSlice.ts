import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  phone: string
  full_name: string
  role: 'customer' | 'partner' | 'mechanic' | 'admin' | 'super_admin' | 'regional_admin' | 'moderator'
  avatar_url: string | null
  is_verified: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action: PayloadAction<{ access_token: string; refresh_token: string }>) {
      state.accessToken = action.payload.access_token
      state.refreshToken = action.payload.refresh_token
      state.isAuthenticated = true
      localStorage.setItem('access_token', action.payload.access_token)
      localStorage.setItem('refresh_token', action.payload.refresh_token)
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload
    },
    logout(state) {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
  },
})

export const { setTokens, setUser, logout, setLoading } = authSlice.actions
export default authSlice.reducer
