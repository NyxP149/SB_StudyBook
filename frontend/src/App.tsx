import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { UploadPage } from './pages/UploadPage'
import { NotesListPage } from './pages/NotesListPage'
import { NoteDetailPage } from './pages/NoteDetailPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { FoldersPage } from './pages/FoldersPage'
import { AuthPage } from './pages/AuthPage'
import { useAuth } from './auth/AuthContext'

function App() {
  const { username, isLoading } = useAuth()

  if (isLoading) {
    return <div className="app-loading">Chargement…</div>
  }

  if (!username) {
    return <AuthPage />
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/notes" element={<NotesListPage />} />
        <Route path="/notes/:id" element={<NoteDetailPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/folders" element={<FoldersPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
