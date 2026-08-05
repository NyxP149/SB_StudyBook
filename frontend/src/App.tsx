import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { UploadPage } from './pages/UploadPage'
import { NotesListPage } from './pages/NotesListPage'
import { NoteDetailPage } from './pages/NoteDetailPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { FoldersPage } from './pages/FoldersPage'

function App() {
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
