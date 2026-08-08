const DB_NAME = 'studybook-offline'
const STORE_NAME = 'pending-recordings'
const DB_VERSION = 1

export interface PendingRecording {
  id: string
  blob: Blob
  filename: string
  provider: string
  modelSize: string
  templateId?: string
  createdAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const request = run(tx.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function savePendingRecording(input: Omit<PendingRecording, 'id' | 'createdAt'>): Promise<PendingRecording> {
  const recording: PendingRecording = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await withStore('readwrite', (store) => store.add(recording))
  return recording
}

export async function listPendingRecordings(): Promise<PendingRecording[]> {
  const all = await withStore<PendingRecording[]>('readonly', (store) => store.getAll())
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function deletePendingRecording(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}
