import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitNote } from '../api/client'
import './UploadPage.css'

type RecordingState = 'idle' | 'recording' | 'submitting'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function UploadPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [provider, setProvider] = useState('ollama')
  const [modelSize, setModelSize] = useState('medium')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearInterval(timerRef.current)
  }, [])

  const submit = useCallback(
    async (blob: Blob, filename: string) => {
      setState('submitting')
      setError(null)
      try {
        const note = await submitNote(blob, filename, { provider, modelSize })
        navigate(`/notes/${note.id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Échec de l\'envoi.')
        setState('idle')
      }
    },
    [navigate, provider, modelSize],
  )

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        setError('Ce fichier ne ressemble pas à un audio.')
        return
      }
      void submit(file, file.name)
    },
    [submit],
  )

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        window.clearInterval(timerRef.current)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        void submit(blob, `enregistrement-${Date.now()}.webm`)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setSeconds(0)
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
      setState('recording')
    } catch {
      setError('Impossible d\'accéder au microphone. Vérifie les permissions du navigateur.')
    }
  }, [submit])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  return (
    <div className="upload-page">
      <header className="upload-intro">
        <h1>Un discours à transformer en note ?</h1>
        <p>Enregistre-le en direct, ou dépose un fichier audio existant.</p>
      </header>

      <div className="upload-panel">
        <div className="record-zone">
          <button
            type="button"
            className={`record-button ${state === 'recording' ? 'is-recording' : ''}`}
            onClick={state === 'recording' ? stopRecording : startRecording}
            disabled={state === 'submitting'}
            aria-label={state === 'recording' ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
          >
            {state === 'recording' && (
              <>
                <span className="record-ring ring-1" />
                <span className="record-ring ring-2" />
              </>
            )}
            <span className="record-icon">{state === 'recording' ? '■' : '●'}</span>
          </button>
          <p className="record-caption">
            {state === 'recording' ? formatDuration(seconds) : state === 'submitting' ? 'Envoi en cours…' : 'Enregistrer'}
          </p>
        </div>

        <div className="upload-divider">
          <span>ou</span>
        </div>

        <label
          className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="audio/*,video/*"
            hidden
            disabled={state === 'submitting'}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
          <span className="dropzone-icon">📎</span>
          <span>
            <strong>Dépose un fichier audio</strong>
            <br />
            ou clique pour en choisir un
          </span>
        </label>
      </div>

      <div className="upload-settings">
        <label>
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)} disabled={state === 'submitting'}>
            <option value="ollama">Ollama (local)</option>
            <option value="anthropic">Claude</option>
            <option value="stub">Stub (sans IA)</option>
          </select>
        </label>
        <label>
          Modèle Whisper
          <select value={modelSize} onChange={(e) => setModelSize(e.target.value)} disabled={state === 'submitting'}>
            <option value="tiny">tiny — rapide</option>
            <option value="small">small</option>
            <option value="medium">medium</option>
            <option value="large-v3">large-v3 — précis</option>
          </select>
        </label>
      </div>

      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}
