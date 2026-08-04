import { useEffect, useRef, useState } from 'react'
import { getNote } from '../api/client'
import type { Note } from '../types'

const POLL_INTERVAL_MS = 2500

export function useNote(id: string | undefined) {
  const [note, setNote] = useState<Note | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function poll() {
      try {
        const result = await getNote(id!)
        if (cancelled) return
        setNote(result)
        setError(null)
        if (result.status === 'PENDING') {
          timeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      }
    }

    poll()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutRef.current)
    }
  }, [id])

  return { note, error }
}
