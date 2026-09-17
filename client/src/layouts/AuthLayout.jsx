import { Outlet, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'

export function AuthLayout() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="relative min-h-screen w-full">
      <Outlet />
    </div>
  )
}
