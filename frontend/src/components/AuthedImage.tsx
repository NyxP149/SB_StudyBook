import { useEffect, useState } from 'react'
import { fetchStudyImageObjectUrl } from '../api/client'

export function AuthedImage({ imageId, alt, className }: { imageId: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    fetchStudyImageObjectUrl(imageId).then((u) => {
      if (cancelled) {
        URL.revokeObjectURL(u)
        return
      }
      objectUrl = u
      setUrl(u)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageId])

  if (!url) return <div className={`authed-image-placeholder ${className ?? ''}`} />
  return <img src={url} alt={alt} className={className} />
}
