import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  ApiError,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  setAuthToken,
  setUnauthorizedHandler,
} from '../api/client'

const STORAGE_KEY = 'studybook.auth'
const API_CACHE_NAME = 'studybook-api-cache'

function clearApiCache() {
  if (typeof caches === 'undefined') return
  caches.delete(API_CACHE_NAME).catch(() => {
    // pas grave si le cache n'existe pas ou n'est pas accessible
  })
}

interface StoredAuth {
  token: string
  username: string
}

interface AuthContextValue {
  username: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(STORAGE_KEY)
      setAuthToken(null)
      setUsername(null)
      clearApiCache()
    })

    const stored = readStoredAuth()
    if (!stored) {
      setIsLoading(false)
      return
    }

    setAuthToken(stored.token)
    // Optimiste : on affiche tout de suite la session mise en cache plutôt
    // que d'attendre la validation réseau — sinon un rechargement hors
    // ligne bloque indéfiniment sur l'écran de chargement (ou pire, voir
    // ci-dessous, se solde par une déconnexion sans moyen de se reconnecter).
    setUsername(stored.username)
    setIsLoading(false)
    getMe()
      .then((me) => setUsername(me.username))
      .catch((e) => {
        // Ne déconnecte que sur un vrai rejet du serveur (token invalide/
        // expiré). Une panne réseau (hors ligne) ne doit pas invalider la
        // session locale, sinon il devient impossible de se reconnecter
        // tant qu'on n'a pas retrouvé de connexion.
        if (e instanceof ApiError && e.status === 401) {
          localStorage.removeItem(STORAGE_KEY)
          setAuthToken(null)
          setUsername(null)
        }
      })
  }, [])

  async function login(usernameInput: string, password: string) {
    const result = await apiLogin(usernameInput, password)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
    setAuthToken(result.token)
    setUsername(result.username)
  }

  async function register(usernameInput: string, password: string) {
    const result = await apiRegister(usernameInput, password)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
    setAuthToken(result.token)
    setUsername(result.username)
  }

  function logout() {
    apiLogout().catch(() => {
      // best-effort: on efface la session locale de toute facon
    })
    localStorage.removeItem(STORAGE_KEY)
    setAuthToken(null)
    setUsername(null)
    clearApiCache()
  }

  return (
    <AuthContext.Provider value={{ username, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit etre utilise a l\'interieur de AuthProvider')
  return ctx
}
