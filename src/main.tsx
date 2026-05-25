import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// 初始化主题
const savedTheme = localStorage.getItem('sf-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// 初始化主题按钮文字
setTimeout(() => {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = savedTheme === 'light' ? '🌙' : '☀️';
  }
}, 0);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
