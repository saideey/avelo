import axios from 'axios'
import { store } from '@/app/store'
import { logout, setTokens } from '@/features/auth/authSlice'

const API_URL = '/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = store.getState().auth.refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          store.dispatch(setTokens(data))
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`
          return api(originalRequest)
        } catch {
          store.dispatch(logout())
        }
      } else {
        store.dispatch(logout())
      }
    }
    return Promise.reject(error)
  },
)

export default api
