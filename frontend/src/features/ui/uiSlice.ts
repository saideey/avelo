import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  sidebarOpen: boolean
  language: 'uz' | 'ru'
  theme: 'light' | 'dark'
}

const initialState: UIState = {
  sidebarOpen: false,
  language: (localStorage.getItem('lang') as 'uz' | 'ru') || 'uz',
  theme: 'light',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    setLanguage(state, action: PayloadAction<'uz' | 'ru'>) {
      state.language = action.payload
      localStorage.setItem('lang', action.payload)
    },
  },
})

export const { toggleSidebar, setSidebarOpen, setLanguage } = uiSlice.actions
export default uiSlice.reducer
