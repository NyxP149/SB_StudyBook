import { Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppShell } from './components/AppShell'
import { UploadPage } from './pages/UploadPage'
import { NotesListPage } from './pages/NotesListPage'
import { NoteDetailPage } from './pages/NoteDetailPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { FoldersPage } from './pages/FoldersPage'
import { StudyProgramsPage } from './pages/StudyProgramsPage'
import { StudyProgramDetailPage } from './pages/StudyProgramDetailPage'
import { StudyProgramGridPage } from './pages/StudyProgramGridPage'
import { StudyArgumentDetailPage } from './pages/StudyArgumentDetailPage'
import { AuthPage } from './pages/AuthPage'
import { useAuth } from './auth/AuthContext'

function App() {
  const { t } = useTranslation()
  const { username, isLoading } = useAuth()

  if (isLoading) {
    return <div className="app-loading">{t('common.loading')}</div>
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
        <Route path="/study" element={<StudyProgramsPage />} />
        <Route path="/study/programs/new" element={<StudyProgramGridPage />} />
        <Route path="/study/programs/:id" element={<StudyProgramDetailPage />} />
        <Route path="/study/programs/:id/grid" element={<StudyProgramGridPage />} />
        <Route path="/study/arguments/:id" element={<StudyArgumentDetailPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
