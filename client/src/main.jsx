import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from '@/redux/store'
import { setAuthToken } from '@/api/client'
import { FullPageLoader } from '@/components/ui'
import App from './App'
import '@/styles/index.css'

let tokenRestored = false
const restoreToken = () => {
  if (tokenRestored) return
  if (!persistor.getState().bootstrapped) return
  tokenRestored = true
  const { token, refreshToken } = store.getState().auth
  if (token) setAuthToken(token, refreshToken)
}

restoreToken()

persistor.subscribe(restoreToken)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={<FullPageLoader />} persistor={persistor} onBeforeLift={restoreToken}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>
)
