import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
  const [generateNote, setGenerateNote] = useState(true)

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
        setError(t('upload.errSilence'))
        setState('idle')
        return
      }

      if (!isOnline) {
        try {
          await savePendingRecording({ blob, filename, provider, modelSize, templateId: templateId || undefined })
          setInfo(t('upload.infoSavedOffline'))
          setPendingRefreshKey((k) => k + 1)
        } catch {
          setError(t('upload.errSaveOfflineFailed'))
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
        setError(e instanceof Error ? e.message : t('upload.errSendFailed'))
        setState('idle')
      }
    },
    [navigate, provider, modelSize, templateId, isOnline, t],
  )

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        setError(t('upload.errNotAudio'))
        return
      }
      void submit(file, file.name)
    },
    [submit, t],
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
        { provider, templateId: templateId || undefined, generate: generateNote },
      )
      navigate(`/notes/${note.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('upload.errSendFailed'))
      setState('idle')
    }
  }, [navigate, provider, templateId, pastedText, textFile, generateNote, t])

  const handleTextFile = useCallback((file: File) => {
    const isTextLike =
      file.name.endsWith('.txt') ||
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.docx') ||
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type.startsWith('text/')
    if (!isTextLike) {
      setError(t('upload.errNotText'))
      return
    }
    setError(null)
    setTextFile(file)
    setPastedText('')
  }, [t])

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
      setError(t('upload.errMicAccess'))
    }
  }, [submit, t])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  const hasTextInput = Boolean(textFile || pastedText.trim())

  return (
    <div className="upload-page">
      <header className="upload-intro">
        <h1>{t('upload.title')}</h1>
        <p>{mode === 'audio' ? t('upload.subtitleAudio') : t('upload.subtitleText')}</p>
      </header>

      <div className="mode-tabs">
        <button
          type="button"
          className={`mode-tab ${mode === 'audio' ? 'active' : ''}`}
          onClick={() => setMode('audio')}
          disabled={state === 'submitting'}
        >
          {t('upload.tabAudio')}
        </button>
        <button
          type="button"
          className={`mode-tab ${mode === 'text' ? 'active' : ''}`}
          onClick={() => setMode('text')}
          disabled={state === 'submitting'}
        >
          {t('upload.tabText')}
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
              aria-label={state === 'recording' ? t('upload.stopRecordingAria') : t('upload.startRecordingAria')}
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
              {state === 'recording' ? formatDuration(seconds) : state === 'submitting' ? t('upload.sending') : t('upload.record')}
            </p>
          </div>

          <div className="upload-divider">
            <span>{t('common.or')}</span>
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
              <strong>{t('upload.dropAudioTitle')}</strong>
              <br />
              {t('upload.dropChoose')}
            </span>
          </label>
        </div>
      ) : (
        <div className="text-panel">
          <textarea
            className="text-paste-area"
            placeholder={t('upload.pastePlaceholder')}
            value={pastedText}
            disabled={state === 'submitting' || Boolean(textFile)}
            onChange={(e) => setPastedText(e.target.value)}
            rows={8}
          />

          <div className="upload-divider">
            <span>{t('common.or')}</span>
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
                accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                <strong>{t('upload.dropTextTitle')}</strong>
                <br />
                {t('upload.dropChoose')}
              </span>
            </label>
          )}
        </div>
      )}

      {mode === 'text' && (
        <div className="mode-tabs generate-mode-tabs">
          <button
            type="button"
            className={`mode-tab ${generateNote ? 'active' : ''}`}
            onClick={() => setGenerateNote(true)}
            disabled={state === 'submitting'}
          >
            {t('upload.generateModeAi')}
          </button>
          <button
            type="button"
            className={`mode-tab ${!generateNote ? 'active' : ''}`}
            onClick={() => setGenerateNote(false)}
            disabled={state === 'submitting'}
          >
            {t('upload.generateModeRaw')}
          </button>
        </div>
      )}
      {mode === 'text' && !generateNote && <p className="upload-mode-hint">{t('upload.generateModeRawHint')}</p>}

      {(mode === 'audio' || generateNote) && (
        <div className="upload-settings">
          <label>
            {t('upload.provider')}
            <select value={provider} onChange={(e) => setProvider(e.target.value)} disabled={state === 'submitting'}>
              <option value="ollama">{t('upload.providerOllama')}</option>
              <option value="gemini">{t('upload.providerGemini')}</option>
              <option value="anthropic">{t('upload.providerClaude')}</option>
              <option value="stub">{t('upload.providerStub')}</option>
            </select>
          </label>
          {mode === 'audio' && (
            <label>
              {t('upload.whisperModel')}
              <select value={modelSize} onChange={(e) => setModelSize(e.target.value)} disabled={state === 'submitting'}>
                <option value="tiny">{t('upload.modelTiny')}</option>
                <option value="small">{t('upload.modelSmall')}</option>
                <option value="medium">{t('upload.modelMedium')}</option>
                <option value="large-v3">{t('upload.modelLarge')}</option>
              </select>
            </label>
          )}
          <label>
            {t('upload.template')}
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={state === 'submitting'}>
              <option value="">{t('common.defaultStructure')}</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {mode === 'text' && (
        <button
          type="button"
          className="text-submit-button"
          onClick={submitText}
          disabled={state === 'submitting' || !hasTextInput}
        >
          {state === 'submitting'
            ? t('upload.sending')
            : generateNote
              ? t('upload.generateButton')
              : t('upload.generateButtonRaw')}
        </button>
      )}

      {templates.length === 0 && (
        <p className="upload-template-hint">
          <Link to="/templates">{t('upload.createTemplateLink')}</Link> {t('upload.createTemplateHint')}
        </p>
      )}

      {error && <p className="upload-error">{error}</p>}
      {info && <p className="upload-info">{info}</p>}

      <PendingRecordings key={pendingRefreshKey} />
    </div>
  )
}
