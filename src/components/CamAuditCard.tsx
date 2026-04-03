'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2, Upload, Search, AlertTriangle, CheckCircle2,
  ChevronDown, FileText, Download, ShieldAlert, Info,
  Copy, Check, X, Pencil,
} from 'lucide-react'
import type { CamAuditFinding, CamAuditRuleStatus } from '@/types'
import { exportDisputeLetter } from '@/lib/pdfExport'

interface CamAuditCardProps {
  storeId: string
  storeName: string
}

interface AuditRecord {
  id: string
  statement_file_name: string
  total_potential_overcharge: number
  findings: CamAuditFinding[]
  audit_date: string
  dispute_deadline: string | null
}

const STATUS_CONFIG: Record<CamAuditRuleStatus, {
  bg: string; border: string; text: string; label: string
}> = {
  violation_found: {
    bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)',
    text: 'text-red-400', label: 'Violation',
  },
  within_limits: {
    bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)',
    text: 'text-emerald-400', label: 'OK',
  },
  insufficient_data: {
    bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.18)',
    text: 'text-slate-400', label: 'No Data',
  },
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CamAuditCard({ storeId, storeName }: CamAuditCardProps) {
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [generatingLetter, setGeneratingLetter] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [showLetterModal, setShowLetterModal] = useState(false)
  const [disputeLetter, setDisputeLetter] = useState<string | null>(null)
  const [editableLetter, setEditableLetter] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/cam-audit?store_id=${storeId}`)
      .then(r => r.json())
      .then(data => setAudits(data.audits ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeId])

  const handleAudit = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setDisputeLetter(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('store_id', storeId)

      const res = await fetch('/api/cam-audit', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok && data.audit) {
        const newAudit: AuditRecord = {
          id: crypto.randomUUID(),
          statement_file_name: data.audit.statement_file_name,
          total_potential_overcharge: data.audit.total_potential_overcharge,
          findings: data.audit.findings,
          audit_date: data.audit.audit_date,
          dispute_deadline: data.audit.dispute_deadline,
        }
        setAudits(prev => [newAudit, ...prev])
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setError(data.error ?? 'Audit failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDisputeLetter = async () => {
    if (!latestAudit) return
    setGeneratingLetter(true)
    setError(null)
    try {
      const res = await fetch('/api/cam-audit/dispute-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: latestAudit.id }),
      })
      const data = await res.json()
      if (res.ok && data.letter) {
        setDisputeLetter(data.letter)
        setEditableLetter(data.letter)
        setIsEditing(false)
        setShowLetterModal(true)
      } else {
        setError(data.error ?? 'Could not generate letter')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGeneratingLetter(false)
    }
  }

  const handleCopy = async () => {
    const text = isEditing ? editableLetter : (disputeLetter ?? '')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPdf = () => {
    const text = isEditing ? editableLetter : (disputeLetter ?? '')
    exportDisputeLetter(text, storeName)
  }

  const latestAudit = audits[0] ?? null
  const violations = latestAudit?.findings.filter(f => f.status === 'violation_found') ?? []
  const withinLimits = latestAudit?.findings.filter(f => f.status === 'within_limits') ?? []
  const insufficientData = latestAudit?.findings.filter(f => f.status === 'insufficient_data') ?? []

  // No audit yet — show educational content
  if (!loading && !latestAudit) {
    return (
      <div className="glass-card p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
          >
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">CAM Forensic Audit</p>
            <p className="text-xs text-muted-foreground/60">14-point overcharge detection</p>
          </div>
        </div>

        {/* Empty state content */}
        <div className="text-center py-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <Search className="h-7 w-7 text-red-400/60" />
          </div>
          <p className="font-semibold text-sm mb-1">Upload your CAM reconciliation statement to run a forensic audit</p>
          <p className="text-xs text-muted-foreground/60 mb-4 max-w-sm mx-auto">
            We check against 14 detection rules to find potential overcharges.
          </p>
        </div>

        {/* Expandable: What is a CAM reconciliation? */}
        <details className="rounded-xl overflow-hidden" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <summary className="px-4 py-3 text-xs font-semibold text-red-300/80 cursor-pointer flex items-center gap-2 hover:text-red-300 transition-colors">
            <Info className="h-3.5 w-3.5 shrink-0" />
            What is a CAM reconciliation?
          </summary>
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs text-white/55 leading-relaxed">
              A CAM (Common Area Maintenance) reconciliation is an annual statement from your landlord comparing estimated CAM charges you paid throughout the year to the actual expenses incurred. It determines whether you owe additional money or are due a refund.
            </p>
            <p className="text-xs text-white/55 leading-relaxed">
              Industry studies show that approximately <span className="text-red-400 font-semibold">40% of CAM statements contain errors</span> — often in the landlord&apos;s favor. Our forensic audit cross-references every charge against your lease provisions.
            </p>
          </div>
        </details>

        {/* Upload area */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <label
              className={`flex-1 flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <span className="text-sm text-muted-foreground/70 truncate">
                Choose CAM reconciliation statement (PDF)
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={() => setError(null)}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <button
              onClick={handleAudit}
              disabled={uploading}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgb(248,113,113)' }}
            >
              {uploading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Auditing…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Search className="h-3 w-3" />
                  Run Forensic Audit
                </span>
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-400/80">{error}</p>}
      </div>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="glass-card p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-40 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-56 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="glass-card p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
          >
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">CAM Forensic Audit</p>
            <p className="text-xs text-muted-foreground/60">14-point overcharge detection</p>
          </div>
        </div>

        {/* Upload area for new audit */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <label
              className={`flex-1 flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <span className="text-sm text-muted-foreground/70 truncate">
                Upload new CAM statement (PDF)
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={() => setError(null)}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <button
              onClick={handleAudit}
              disabled={uploading}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgb(248,113,113)' }}
            >
              {uploading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Auditing…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Search className="h-3 w-3" />
                  Run Forensic Audit
                </span>
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-400/80">{error}</p>}

        {/* Latest audit results */}
        {latestAudit && (
          <div className="space-y-4">
            {/* File name and date */}
            <p className="text-[10px] text-white/30">
              {latestAudit.statement_file_name} — {new Date(latestAudit.audit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>

            {/* Total overcharge banner */}
            <div
              className="rounded-xl px-5 py-4 text-center"
              style={{
                background: latestAudit.total_potential_overcharge > 0
                  ? 'rgba(239,68,68,0.08)'
                  : 'rgba(16,185,129,0.08)',
                border: `1px solid ${latestAudit.total_potential_overcharge > 0
                  ? 'rgba(239,68,68,0.20)'
                  : 'rgba(16,185,129,0.20)'}`,
              }}
            >
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1">
                Total Potential Overcharge
              </p>
              <p className={`text-2xl font-extrabold tabular-nums ${
                latestAudit.total_potential_overcharge > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {formatCurrency(latestAudit.total_potential_overcharge)}
              </p>
              {latestAudit.dispute_deadline && (
                <p className="text-[10px] text-amber-400/70 mt-1.5">
                  Dispute deadline: {new Date(latestAudit.dispute_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Summary badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {violations.length > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md text-red-400"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)' }}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {violations.length} Violation{violations.length !== 1 ? 's' : ''}
                </span>
              )}
              {withinLimits.length > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md text-emerald-400"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {withinLimits.length} OK
                </span>
              )}
              {insufficientData.length > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md text-slate-400"
                  style={{ background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.22)' }}
                >
                  {insufficientData.length} No Data
                </span>
              )}
            </div>

            {/* Findings list */}
            <div className="space-y-1.5">
              {/* Violations first, then within_limits, then insufficient_data */}
              {[...violations, ...withinLimits, ...insufficientData].map((finding) => {
                const cfg = STATUS_CONFIG[finding.status]
                const isExpanded = expandedRule === finding.rule_name

                return (
                  <div
                    key={finding.rule_name}
                    className="rounded-xl overflow-hidden transition-all"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : finding.rule_name)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{finding.rule_name}</p>
                      </div>
                      {finding.estimated_overcharge > 0 && (
                        <span className="text-xs font-bold text-red-400 tabular-nums shrink-0">
                          {formatCurrency(finding.estimated_overcharge)}
                        </span>
                      )}
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${cfg.text}`}
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.label}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-2 border-t" style={{ borderColor: cfg.border }}>
                        <p className="text-xs text-white/60 leading-relaxed">{finding.explanation}</p>
                        <div className="flex flex-wrap gap-2">
                          {finding.lease_reference && (
                            <span
                              className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: 'rgb(52,211,153)' }}
                            >
                              Lease: {finding.lease_reference}
                            </span>
                          )}
                          {finding.statement_reference && (
                            <span
                              className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgb(251,191,36)' }}
                            >
                              Statement: {finding.statement_reference}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Generate Dispute Letter button */}
            {violations.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={disputeLetter ? () => setShowLetterModal(true) : handleDisputeLetter}
                  disabled={generatingLetter}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgb(248,113,113)' }}
                >
                  {generatingLetter ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Dispute Letter…
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      {disputeLetter ? 'View Dispute Letter' : 'Generate Dispute Letter'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Previous audits */}
        {audits.length > 1 && (
          <div>
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2">Previous Audits</p>
            <div className="space-y-1.5">
              {audits.slice(1).map((audit) => {
                const vCount = audit.findings.filter(f => f.status === 'violation_found').length
                return (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-white/60 truncate">{audit.statement_file_name}</p>
                      <p className="text-[10px] text-white/30">
                        {new Date(audit.audit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${audit.total_potential_overcharge > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(audit.total_potential_overcharge)}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {vCount} violation{vCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-[10px] text-white/25 italic">
          AI-powered forensic analysis — consult a professional before taking legal action on identified overcharges.
        </p>
      </div>

      {/* ── Dispute Letter Modal ──────────────────────────────────────────────── */}
      {showLetterModal && disputeLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLetterModal(false)}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'rgba(20,22,30,0.98)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
                >
                  <FileText className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">CAM Dispute Letter</p>
                  <p className="text-[10px] text-muted-foreground/50">{storeName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLetterModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isEditing ? (
                <textarea
                  value={editableLetter}
                  onChange={e => setEditableLetter(e.target.value)}
                  className="w-full h-full min-h-[400px] bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-white/80 leading-relaxed font-mono resize-y focus:outline-none focus:border-emerald-500/30 transition-colors"
                  spellCheck={false}
                />
              ) : (
                <div
                  className="rounded-xl px-4 py-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <pre className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap font-mono">
                    {editableLetter || disputeLetter}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false)
                  } else {
                    setEditableLetter(editableLetter || disputeLetter)
                    setIsEditing(true)
                  }
                }}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgb(251,191,36)' }}
              >
                <Pencil className="h-3.5 w-3.5" />
                {isEditing ? 'Done Editing' : 'Edit'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: 'rgb(52,211,153)' }}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy to Clipboard
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: 'rgb(129,140,248)' }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
