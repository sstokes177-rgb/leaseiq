'use client'

import { useState, useRef, useCallback, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileText, X, Loader2, AlertTriangle, CheckCircle, AlertCircle, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx']
const ACCEPTED_MIME = [
  'application/pdf',
  'application/x-pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

type FileStatus = 'pending' | 'uploading' | 'done' | 'failed' | 'duplicate' | 'mismatch' | 'needs_confirmation'

interface FileEntry {
  localId: string
  file: File
  status: FileStatus
  error?: string
  classification?: { description: string; document_type: string }
}

interface BatchFileUploadProps {
  storeId?: string | null
  onUploadComplete: () => void
  onChangeStore?: () => void
}

function isAcceptedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ACCEPTED_MIME.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext)
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === 'uploading') return <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
  if (status === 'done') return <CheckCircle className="h-4 w-4 text-emerald-400" />
  if (status === 'failed') return <AlertTriangle className="h-4 w-4 text-red-400" />
  if (status === 'duplicate') return <SkipForward className="h-4 w-4 text-amber-400" />
  if (status === 'mismatch') return <AlertCircle className="h-4 w-4 text-amber-400" />
  if (status === 'needs_confirmation') return <AlertCircle className="h-4 w-4 text-amber-400" />
  return null
}

function statusLabel(status: FileStatus): string {
  switch (status) {
    case 'uploading': return 'Processing\u2026'
    case 'done': return 'Uploaded'
    case 'failed': return 'Failed'
    case 'duplicate': return 'Already uploaded'
    case 'mismatch': return 'Location mismatch'
    case 'needs_confirmation': return 'Needs confirmation'
    default: return ''
  }
}

function statusColor(status: FileStatus): string {
  switch (status) {
    case 'done': return 'text-emerald-400'
    case 'failed': return 'text-red-400'
    case 'duplicate': return 'text-amber-400/80'
    case 'mismatch': return 'text-amber-400'
    case 'needs_confirmation': return 'text-amber-400'
    case 'uploading': return 'text-emerald-400'
    default: return 'text-muted-foreground'
  }
}

export function BatchFileUpload({ storeId, onUploadComplete, onChangeStore }: BatchFileUploadProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [phase, setPhase] = useState<'selecting' | 'uploading' | 'done'>('selecting')
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const validated: FileEntry[] = []

    for (const file of arr) {
      if (!isAcceptedFile(file)) continue
      if (file.size > 20 * 1024 * 1024) continue
      if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) continue
      // Deduplicate by name within current selection
      const alreadyAdded = files.some((f) => f.file.name === file.name)
      if (alreadyAdded) continue
      validated.push({ localId: `${file.name}-${Date.now()}-${Math.random()}`, file, status: 'pending' })
    }

    setFiles((prev) => [...prev, ...validated])
  }, [files])

  const removeFile = (localId: string) => {
    setFiles((prev) => prev.filter((f) => f.localId !== localId))
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (phase !== 'selecting') return
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const updateFileStatus = (localId: string, update: Partial<FileEntry>) => {
    setFiles((prev) => prev.map((f) => f.localId === localId ? { ...f, ...update } : f))
  }

  const uploadAll = async () => {
    if (files.length === 0 || phase !== 'selecting') return
    setPhase('uploading')
    let anySucceeded = false

    for (const entry of files) {
      updateFileStatus(entry.localId, { status: 'uploading' })

      try {
        const formData = new FormData()
        formData.append('file', entry.file)
        if (storeId) formData.append('store_id', storeId)

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) {
          updateFileStatus(entry.localId, { status: 'failed', error: data.error ?? 'Upload failed' })
          continue
        }

        const result = data.results?.[0]
        if (!result) {
          updateFileStatus(entry.localId, { status: 'failed', error: 'Unexpected response from server' })
          continue
        }

        if (result.status === 'success') {
          updateFileStatus(entry.localId, { status: 'done' })
          anySucceeded = true
        } else if (result.status === 'needs_confirmation') {
          updateFileStatus(entry.localId, {
            status: 'needs_confirmation',
            error: result.classification?.description,
            classification: result.classification,
          })
        } else if (result.status === 'duplicate') {
          updateFileStatus(entry.localId, { status: 'duplicate' })
        } else if (result.status === 'mismatch') {
          updateFileStatus(entry.localId, { status: 'mismatch', error: result.error })
        } else {
          updateFileStatus(entry.localId, { status: 'failed', error: result.error ?? 'Upload failed' })
        }
      } catch {
        updateFileStatus(entry.localId, { status: 'failed', error: 'Network error. Please check your connection.' })
      }
    }

    setPhase('done')
    if (anySucceeded) onUploadComplete()
  }

  const confirmAndUpload = async (entry: FileEntry) => {
    updateFileStatus(entry.localId, { status: 'uploading', classification: undefined })

    try {
      const formData = new FormData()
      formData.append('file', entry.file)
      if (storeId) formData.append('store_id', storeId)
      formData.append('skip_classification', 'true')
      if (entry.classification?.document_type) {
        formData.append('classification_type', entry.classification.document_type)
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        updateFileStatus(entry.localId, { status: 'failed', error: data.error ?? 'Upload failed' })
        return
      }

      const result = data.results?.[0]
      if (!result) {
        updateFileStatus(entry.localId, { status: 'failed', error: 'Unexpected response' })
        return
      }

      if (result.status === 'success') {
        updateFileStatus(entry.localId, { status: 'done' })
        onUploadComplete()
      } else if (result.status === 'duplicate') {
        updateFileStatus(entry.localId, { status: 'duplicate' })
      } else if (result.status === 'mismatch') {
        updateFileStatus(entry.localId, { status: 'mismatch', error: result.error })
      } else {
        updateFileStatus(entry.localId, { status: 'failed', error: result.error ?? 'Upload failed' })
      }
    } catch {
      updateFileStatus(entry.localId, { status: 'failed', error: 'Network error' })
    }
  }

  const confirmAllPending = async () => {
    const toConfirm = files.filter((f) => f.status === 'needs_confirmation')
    for (const entry of toConfirm) {
      await confirmAndUpload(entry)
    }
  }

  const dismissAllConfirmations = () => {
    setFiles((prev) => prev.map((f) =>
      f.status === 'needs_confirmation'
        ? { ...f, status: 'failed' as const, error: 'Skipped — not a lease document' }
        : f
    ))
  }

  const reset = () => {
    setFiles([])
    setPhase('selecting')
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Summary counts ───────────────────────────────────────────────────────────
  const succeeded = files.filter((f) => f.status === 'done').length
  const failed = files.filter((f) => f.status === 'failed').length
  const dupes = files.filter((f) => f.status === 'duplicate').length
  const mismatches = files.filter((f) => f.status === 'mismatch').length
  const needsConfirmation = files.filter((f) => f.status === 'needs_confirmation').length

  const isUploading = phase === 'uploading'
  const isDone = phase === 'done'

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground/80 leading-relaxed">
        Upload your lease, amendments, commencement letters, and any other lease-related documents.
        You can select multiple files at once.
      </p>

      {/* Drop zone — always shown so user can add more files */}
      {!isDone && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-6 text-center transition-colors select-none',
            isUploading ? 'opacity-40 pointer-events-none' : 'cursor-pointer',
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-border/60 hover:border-emerald-500/50 hover:bg-accent/30'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files) }}
          />
          {isDragging ? (
            <>
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500/15 mb-2">
                <Upload className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-emerald-400">Drop your files here</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-muted mb-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {files.length > 0 ? 'Drop more files here' : 'Drop files here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF or Word (.doc, .docx) &middot; up to 20 MB each &middot; multiple files OK</p>
            </>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((entry) => (
            <div
              key={entry.localId}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] shrink-0">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.file.name}</p>
                <p className="text-xs text-muted-foreground/70">{formatSize(entry.file.size)}</p>
              </div>

              {/* Status */}
              {entry.status !== 'pending' && entry.status !== 'needs_confirmation' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusIcon status={entry.status} />
                  <span className={`text-xs font-medium ${statusColor(entry.status)}`}>
                    {statusLabel(entry.status)}
                  </span>
                </div>
              )}

              {/* Needs confirmation actions */}
              {entry.status === 'needs_confirmation' && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-amber-200/85">Not a lease doc</span>
                  <button
                    onClick={() => confirmAndUpload(entry)}
                    className="text-xs font-medium text-amber-300/80 hover:text-amber-200 transition-colors px-2 py-1 rounded-lg border border-amber-500/25 hover:border-amber-500/40"
                  >
                    Upload
                  </button>
                  <button
                    onClick={() => updateFileStatus(entry.localId, { status: 'failed', error: 'Skipped — not a lease document' })}
                    className="text-muted-foreground/60 hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Remove button (only when pending) */}
              {entry.status === 'pending' && (
                <button
                  onClick={() => removeFile(entry.localId)}
                  className="text-muted-foreground/60 hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {/* Error detail rows */}
          {files
            .filter((f) => (f.status === 'failed' || f.status === 'mismatch') && f.error)
            .map((entry) => (
              <div
                key={`${entry.localId}-err`}
                className="ml-11 px-3 py-1.5 rounded-lg text-xs leading-relaxed"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}
              >
                <span className="text-red-300/80">{entry.error}</span>
                {entry.status === 'mismatch' && onChangeStore && (
                  <button
                    onClick={onChangeStore}
                    className="ml-2 text-amber-400/80 hover:text-amber-300 underline underline-offset-2"
                  >
                    Change location
                  </button>
                )}
              </div>
            ))}

          {/* Needs confirmation description rows */}
          {files
            .filter((f) => f.status === 'needs_confirmation' && f.classification)
            .map((entry) => (
              <div
                key={`${entry.localId}-confirm`}
                className="ml-11 px-3 py-1.5 rounded-lg text-xs leading-relaxed"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.28)' }}
              >
                <span className="text-amber-200/85">Appears to be: {entry.classification!.description}</span>
              </div>
            ))}
        </div>
      )}

      {/* Confirm all property docs banner */}
      {needsConfirmation > 0 && (
        <div
          className="rounded-xl px-4 py-3 space-y-2.5"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.28)' }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/85 leading-relaxed">
              {needsConfirmation} document{needsConfirmation !== 1 ? 's appear' : ' appears'} to be
              property-related but not a lease document. You can confirm to upload them for reference.
            </p>
          </div>
          <div className="flex gap-2 ml-6">
            <button
              onClick={confirmAllPending}
              className="text-xs font-medium text-amber-300/80 hover:text-amber-200 transition-colors px-2.5 py-1 rounded-lg border border-amber-500/25 hover:border-amber-500/40"
            >
              Confirm &amp; Upload All
            </button>
            <button
              onClick={dismissAllConfirmations}
              className="text-xs font-medium text-muted-foreground/80 hover:text-foreground transition-colors px-2.5 py-1"
            >
              Skip All
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isDone && files.length > 0 && (
        <Button
          onClick={uploadAll}
          disabled={isUploading || files.filter((f) => f.status === 'pending').length === 0}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading {files.filter((f) => f.status === 'uploading').length > 0
                ? `${files.findIndex((f) => f.status === 'uploading') + 1} of ${files.length}\u2026`
                : '\u2026'}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Upload {files.length} file{files.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}

      {/* Done summary */}
      {isDone && (
        <div
          className="rounded-xl px-4 py-3 space-y-2"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.20)' }}
        >
          <p className="text-sm font-semibold text-emerald-300">
            Upload complete
          </p>
          <p className="text-xs text-white/65 leading-relaxed">
            {[
              succeeded > 0 && `${succeeded} uploaded successfully`,
              dupes > 0 && `${dupes} duplicate${dupes !== 1 ? 's' : ''} skipped`,
              mismatches > 0 && `${mismatches} location mismatch${mismatches !== 1 ? 'es' : ''}`,
              needsConfirmation > 0 && `${needsConfirmation} awaiting confirmation`,
              failed > 0 && `${failed} failed`,
            ]
              .filter(Boolean)
              .join(' \u00b7 ')}
          </p>
          <button
            onClick={reset}
            className="text-xs text-emerald-400/80 hover:text-emerald-300 transition-colors font-medium"
          >
            Upload more documents
          </button>
        </div>
      )}

      {!isDone && files.length === 0 && (
        <p className="text-xs text-muted-foreground/60 text-center">
          No files selected yet
        </p>
      )}
    </div>
  )
}
