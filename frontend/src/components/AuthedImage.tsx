import { useEffect, useState } from 'react'

export function AuthedImage({
  imageId,
  alt,
  className,
  fetcher,
}: {
  imageId: string
  alt: string
  className?: string
  fetcher: (id: string) => Promise<string>
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    fetcher(imageId).then((u) => {
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
  }, [imageId, fetcher])

  if (!url) return <div className={`authed-image-placeholder ${className ?? ''}`} />
  return <img src={url} alt={alt} className={className} />
}
