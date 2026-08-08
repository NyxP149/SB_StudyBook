import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { listTemplates, submitNote, submitTextNote } from '../api/client'
import { PendingRecordings } from '../components/PendingRecordings'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { savePendingRecording } from '../offline/pendingRecordings'
import { isSilentAudio } from '../utils/audioSilence'
import type { Template } from '../types'
import './UploadPage.css'

type RecordingState = 'idle' | 'recording' | 'submitting'
type InputMode = 'audio' | 'text'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function UploadPage() {
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [mode, setMode] = useState<InputMode>('audio')
  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [provider, setProvider] = useState('gemini')
  const [modelSize, setModelSize] = useState('tiny')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [pastedText, setPastedText] = useState('')
  const [textFile, setTextFile] = useState<File | null>(null)
  const [isTextDragging, setIsTextDragging] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
  }, [])

  const submit = useCallback(
    async (blob: Blob, filename: string) => {
      setState('submitting')
      setError(null)
      setInfo(null)

      if (await isSilentAudio(blob)) {
        setError("Aucun son détecté dans cet enregistrement (silence). Vérifie ton micro et réessaie.")
        setState('idle')
        return
      }

      if (!isOnline) {
        try {
          await savePendingRecording({ blob, filename, provider, modelSize, templateId: templateId || undefined })
          setInfo('Pas de connexion : enregistrement sauvegardé localement. Envoie-le depuis la liste ci-dessous une fois en ligne.')
          setPendingRefreshKey((k) => k + 1)
        } catch {
          setError("Impossible de sauvegarder l'enregistrement localement.")
        } finally {
          setState('idle')
        }
        return
      }

      try {
        const note = await submitNote(blob, filename, {
          provider,
          modelSize,
          templateId: templateId || undefined,
        })
        navigate(`/notes/${note.id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Échec de l\'envoi.')
        setState('idle')
      }
    },
    [navigate, provider, modelSize, templateId, isOnline],
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

  const submitText = useCallback(async () => {
    setState('submitting')
    setError(null)
    try {
      const note = await submitTextNote(
        { file: textFile ?? undefined, text: textFile ? undefined : pastedText },
        { provider, templateId: templateId || undefined },
      )
      navigate(`/notes/${note.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi.")
      setState('idle')
    }
  }, [navigate, provider, templateId, pastedText, textFile])

  const handleTextFile = useCallback((file: File) => {
    const isTextLike = file.name.endsWith('.txt') || file.name.endsWith('.pdf') || file.type === 'application/pdf' || file.type.startsWith('text/')
    if (!isTextLike) {
      setError('Dépose un fichier .txt ou .pdf.')
      return
    }
    setError(null)
    setTextFile(file)
    setPastedText('')
  }, [])

  const onTextDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsTextDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleTextFile(file)
    },
    [handleTextFile],
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

  const hasTextInput = Boolean(textFile || pastedText.trim())

  return (
    <div className="upload-page">
      <header className="upload-intro">
        <h1>Un discours à transformer en note ?</h1>
        <p>
          {mode === 'audio'
            ? 'Enregistre-le en direct, ou dépose un fichier audio existant.'
            : 'Colle une transcription, ou dépose un fichier .txt / .pdf déjà écrit.'}
        </p>
      </header>

      <div className="mode-tabs">
        <button
          type="button"
          className={`mode-tab ${mode === 'audio' ? 'active' : ''}`}
          onClick={() => setMode('audio')}
          disabled={state === 'submitting'}
        >
          🎙️ Audio
        </button>
        <button
          type="button"
          className={`mode-tab ${mode === 'text' ? 'active' : ''}`}
          onClick={() => setMode('text')}
          disabled={state === 'submitting'}
        >
          📝 Texte / PDF
        </button>
      </div>

      {mode === 'audio' ? (
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
      ) : (
        <div className="text-panel">
          <textarea
            className="text-paste-area"
            placeholder="Colle ici une transcription ou un texte déjà écrit…"
            value={pastedText}
            disabled={state === 'submitting' || Boolean(textFile)}
            onChange={(e) => setPastedText(e.target.value)}
            rows={8}
          />

          <div className="upload-divider">
            <span>ou</span>
          </div>

          {textFile ? (
            <div className="text-file-chip">
              <span>📄 {textFile.name}</span>
              <button type="button" onClick={() => setTextFile(null)} disabled={state === 'submitting'}>
                ✕
              </button>
            </div>
          ) : (
            <label
              className={`dropzone ${isTextDragging ? 'is-dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsTextDragging(true)
              }}
              onDragLeave={() => setIsTextDragging(false)}
              onDrop={onTextDrop}
            >
              <input
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf"
                hidden
                disabled={state === 'submitting'}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleTextFile(file)
                  e.target.value = ''
                }}
              />
              <span className="dropzone-icon">📎</span>
              <span>
                <strong>Dépose un fichier .txt ou .pdf</strong>
                <br />
                ou clique pour en choisir un
              </span>
            </label>
          )}
        </div>
      )}

      <div className="upload-settings">
        <label>
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)} disabled={state === 'submitting'}>
            <option value="ollama">Ollama (local)</option>
            <option value="gemini">Gemini (gratuit)</option>
            <option value="anthropic">Claude</option>
            <option value="stub">Stub (sans IA)</option>
          </select>
        </label>
        {mode === 'audio' && (
          <label>
            Modèle Whisper
            <select value={modelSize} onChange={(e) => setModelSize(e.target.value)} disabled={state === 'submitting'}>
              <option value="tiny">tiny — rapide</option>
              <option value="small">small</option>
              <option value="medium">medium</option>
              <option value="large-v3">large-v3 — précis</option>
            </select>
          </label>
        )}
        <label>
          Template
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={state === 'submitting'}>
            <option value="">Structure par défaut</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === 'text' && (
        <button
          type="button"
          className="text-submit-button"
          onClick={submitText}
          disabled={state === 'submitting' || !hasTextInput}
        >
          {state === 'submitting' ? 'Envoi en cours…' : 'Générer la note'}
        </button>
      )}

      {templates.length === 0 && (
        <p className="upload-template-hint">
          <Link to="/templates">Crée un template</Link> pour adapter la structure de la note à ce type de discours.
        </p>
      )}

      {error && <p className="upload-error">{error}</p>}
      {info && <p className="upload-info">{info}</p>}

      <PendingRecordings key={pendingRefreshKey} />
    </div>
  )
}
