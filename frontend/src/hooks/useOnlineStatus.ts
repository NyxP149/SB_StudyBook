import { useEffect, useRef, useState } from 'react'
import { pingServer } from '../api/client'

// Render (plan gratuit) met le backend en veille après 15 min d'inactivité
// et le réveil peut prendre 20-30s : le timeout et l'intervalle sont
// volontairement généreux pour ne pas afficher "hors ligne" à tort pendant
// un simple redémarrage à froid du serveur.
const PING_TIMEOUT_MS = 8000
const CHECK_INTERVAL_MS = 20000

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const checkingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (checkingRef.current) return
      if (!navigator.onLine) {
        if (!cancelled) setIsOnline(false)
        return
      }
      checkingRef.current = true
      const reachable = await pingServer(PING_TIMEOUT_MS)
      checkingRef.current = false
      if (!cancelled) setIsOnline(reachable)
    }

    const goOffline = () => setIsOnline(false)
    const goOnline = () => void check()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check()
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    document.addEventListener('visibilitychange', onVisibility)

    void check()
    const interval = window.setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [])

  return isOnline
}
