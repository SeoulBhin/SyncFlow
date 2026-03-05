import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useSystemTheme } from '@/hooks/useSystemTheme'
import { ToastContainer } from '@/components/common/ToastContainer'

export function App() {
  useSystemTheme()

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  )
}
