import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PwaProvider } from '@/modules/pwa'
import { App } from './App'
import './styles.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60000 } } })
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PwaProvider>
        <App />
      </PwaProvider>
    </QueryClientProvider>
  </StrictMode>
)
