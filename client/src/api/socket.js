import { io } from 'socket.io-client'
import { getAuthToken } from './client'

const URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5000'

let socket = null

export function getSocket() {
  if (socket && socket.connected) return socket
  const token = getAuthToken()
  if (!token) return null
  socket = io(URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1500,
  })
  return socket
}

export function resetSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
