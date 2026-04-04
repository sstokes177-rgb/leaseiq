'use client'

import { useState, useRef, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileText, X, Loader2, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx']
const ACCEPTED_MIME = [
  'application/pdf',
  'application/x-pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

interface MismatchInfo {
  detected: { tenant_name: string | null; property_name: string | null }
  reference: { tenant_name: string | null; property_name: string | null; display_name: string | null }
}

interface FileUploadProps {
  storeId?: string | null
  onUploadComplete: () => void
  onChangeStore?: () => void
}

function isAcceptedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ACCEPTED_MIME.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext)
}

export function FileUpload({ storeId, onUploadComplete, onChangeStore }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mismatch, setMismatch] = useState<MismatchInfo | null>(null)
  const [confirmingForce, setConfirmingForce] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [classificationPrompt, setClassificationPrompt] = useState<{ description: string; document_type: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!isAcceptedFile(file)) {
      setError('Unsupported file type. Please upload a PDF (.pdf) or Word document (.doc, .docx).')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large (max 20 MB).')
      return
    }
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      setError('Invalid file name.')
      return
    }
    setSelectedFile(file)
    setError(null)
    setMismatch(null)
    setConfirmingForce(false)
    setDuplicateWarning(null)
    setClassificationPrompt(null)

    // Non-blocking duplicate check
    if (storeId) {
      const checkingName = file.name
      fetch(`/api/documents?store_id=${storeId}`)
        .then(r => r.json())
        .then(({ documents }) => {
          if (Array.isArray(documents) && documents.find((d: { file_name: string }) => d.file_name === checkingName)) {
            setDuplicateWarning(checkingName)
          }
        })
        .catch(() => null)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const doUpload = async (force = false, skipClassification = false, classificationType: string | null = null) => {
    if (!selectedFile) return
    setIsUploading(true)
    setError(null)
    setClassificationPrompt(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (storeId) formData.append('store_id', storeId)
      if (force) formData.append('force_upload', 'true')
      if (skipClassification) formData.append('skip_classification', 'true')
      if (classificationType) formData.append('classification_type', classificationType)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      const result = data.results?.[0]
      if (!result) { setError('Upload failed'); return }

      if (result.status === 'success') {
        setSelectedFile(null)
        setMismatch(null)
        setConfirmingForce(false)
        setDuplicateWarning(null)
        setClassificationPrompt(null)
        onUploadComplete()
      } else if (result.status === 'needs_confirmation') {
        setClassificationPrompt(result.classification)
      } else if (result.status === 'mismatch') {
        setMismatch({ detected: result.detected, reference: result.reference })
      } else if (result.status === 'duplicate') {
        setDuplicateWarning(selectedFile!.name)
      } else {
        setError(result.error || 'Upload failed')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Classification confirmation dialog ─────────────────────────────────────
  if (classificationPrompt) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Document type confirmation</p>
            <p className="text-sm text-muted-foreground mt-1">
              This document appears to be a{' '}
              <span className="text-foreground font-medium">{classificationPrompt.description}</span>.
              It will be stored for reference alongside your lease documents. Continue uploading?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => doUpload(false, true, classificationPrompt.document_type)}
            disabled={isUploading}
            size="sm"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Upload Anyway
          </Button>
          <Button
            onClick={() => { setClassificationPrompt(null); setSelectedFile(null) }}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // ── Mismatch dialog ──────────────────────────────────────────────────────────
  if (mismatch) {
    const detectedLabel = [mismatch.detected.tenant_name, mismatch.detected.property_name]
      .filter(Boolean).join(' at ') || 'an unknown entity'
    const refLabel =
      mismatch.reference.display_name ||
      [mismatch.reference.tenant_name, mismatch.reference.property_name]
        .filter(Boolean).join(' at ') ||
      'your existing location'

    if (confirmingForce) {
      return (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Are you sure?</p>
              <p className="text-sm text-muted-foreground mt-1">
                This document appears to belong to{' '}
                <span className="text-foreground font-medium">{detectedLabel}</span>, but you're
                uploading it to{' '}
                <span className="text-foreground font-medium">{refLabel}</span>.
                Confirm only if the detection was wrong.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => doUpload(true)} disabled={isUploading} variant="destructive" size="sm">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Yes, upload anyway
            </Button>
            <Button onClick={() => setConfirmingForce(false)} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Document may not match this location</p>
            <p className="text-sm text-muted-foreground mt-1">
              This document looks like it&apos;s for{' '}
              <span className="text-foreground font-medium">{detectedLabel}</span>, but this
              location is <span className="text-foreground font-medium">{refLabel}</span>.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {onChangeStore && (
            <Button onClick={onChangeStore} variant="outline" size="sm" className="flex-1">
              Upload to a different location
            </Button>
          )}
          <Button
            onClick={() => setConfirmingForce(true)}
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            Upload anyway (detection was wrong)
          </Button>
          <Button
            onClick={() => { setMismatch(null); setSelectedFile(null) }}
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // ── Normal upload UI ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Helper note */}
      <p className="text-xs text-muted-foreground/80 leading-relaxed">
        Upload your lease, amendments, commencement letters, side letters, or any other
        lease-related documents. Our AI reads them all together.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-border/60 hover:border-emerald-500/50 hover:bg-accent/30',
          'select-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {isDragging ? (
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/15 mb-3">
              <Upload className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-400">Drop your file here</p>
          </div>
        ) : selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setDuplicateWarning(null) }}
              className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted mb-3">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Drop your document here</p>
            <p className="text-xs text-muted-foreground mt-1">PDF or Word (.doc, .docx) &middot; max 20 MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {duplicateWarning && (
        <div
          className="rounded-xl px-4 py-3 space-y-2.5"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.28)' }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/85 leading-relaxed">
              <span className="font-semibold text-amber-300">&ldquo;{duplicateWarning}&rdquo;</span>
              {' '}has already been uploaded to this location. Uploading a duplicate may cause
              repeated results in your AI answers.
            </p>
          </div>
          <div className="flex gap-2 ml-6">
            <button
              onClick={() => { setDuplicateWarning(null); setSelectedFile(null) }}
              className="text-xs font-medium text-amber-300/80 hover:text-amber-200 transition-colors px-2.5 py-1 rounded-lg border border-amber-500/25 hover:border-amber-500/40"
            >
              Skip
            </button>
            <button
              onClick={() => setDuplicateWarning(null)}
              className="text-xs font-medium text-amber-300/80 hover:text-amber-200 transition-colors px-2.5 py-1 rounded-lg border border-amber-500/25 hover:border-amber-500/40"
            >
              Upload anyway
            </button>
          </div>
        </div>
      )}

      <Button
        onClick={() => doUpload(false)}
        disabled={!selectedFile || isUploading || !!duplicateWarning}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing&hellip;
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Upload &amp; Process
          </>
        )}
      </Button>
    </div>
  )
}
