'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Upload, ArrowRight, ChevronRight, Plus, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeaseSummaryCard } from '@/components/LeaseSummaryCard'
import { ObligationMatrixCard } from '@/components/ObligationMatrixCard'
import { CamAnalysisCard } from '@/components/CamAnalysisCard'
import { CamReconciliationCard } from '@/components/CamReconciliationCard'
import { PercentageRentCard } from '@/components/PercentageRentCard'
import { OccupancyCostCard } from '@/components/OccupancyCostCard'
import { RentEscalationTimeline } from '@/components/RentEscalationTimeline'
import { LeaseClauseCard } from '@/components/LeaseClauseCard'
import { DocumentListItem } from '@/components/DocumentListItem'
import { CriticalDatesCard } from '@/components/CriticalDatesCard'
import { LocationRiskSection } from '@/components/LocationRiskSection'
import { LeaseComparisonCard } from '@/components/LeaseComparisonCard'

interface DocItem {
  id: string
  file_name: string
  document_type: string
  display_name: string | null
  store_id: string | null
  uploaded_at: string
}

interface ConversationItem {
  id: string
  title: string | null
  created_at: string
  updated_at: string | null
  message_count?: number
}

interface LocationTabsProps {
  storeId: string
  storeName: string
  hasDocuments: boolean
  documents: DocItem[]
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'risk', label: 'Risk & Compliance' },
  { key: 'financial', label: 'Financial' },
  { key: 'documents', label: 'Documents' },
  { key: 'chat', label: 'Chat' },
] as const

type TabKey = (typeof TABS)[number]['key']

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SUGGESTED_QUESTIONS = [
  'What are my renewal options?',
  'Who is responsible for HVAC maintenance?',
  'What are my CAM obligations?',
  'When does my lease expire?',
]

export function LocationTabs({ storeId, storeName, hasDocuments, documents }: LocationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)

  // Fetch conversations when chat tab is active
  useEffect(() => {
    if (activeTab !== 'chat') return
    setLoadingConversations(true)
    fetch(`/api/conversations?store_id=${storeId}`)
      .then(r => r.json())
      .then(data => setConversations(data.conversations ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoadingConversations(false))
  }, [activeTab, storeId])

  if (!hasDocuments) return null

  return (
    <>
      {/* Tab bar — clean underline style, sticky */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mt-6 mb-8 border-b border-white/[0.06] backdrop-blur-xl bg-gray-950/80">
        <div className="flex overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${
                activeTab === tab.key
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="space-y-6" style={{ minHeight: 'calc(100vh - 300px)' }}>
        {activeTab === 'overview' && (
          <>
            <LeaseSummaryCard storeId={storeId} storeName={storeName} />
            <CriticalDatesCard storeId={storeId} />
          </>
        )}

        {activeTab === 'risk' && (
          <>
            <LocationRiskSection storeId={storeId} />
            <ObligationMatrixCard storeId={storeId} storeName={storeName} />
            <LeaseComparisonCard storeId={storeId} storeName={storeName} documentCount={documents.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LeaseClauseCard storeId={storeId} clauseType="co-tenancy" />
              <LeaseClauseCard storeId={storeId} clauseType="exclusive-use" />
            </div>
          </>
        )}

        {activeTab === 'financial' && (
          <>
            <CamAnalysisCard storeId={storeId} />
            <CamReconciliationCard storeId={storeId} />
            <OccupancyCostCard storeId={storeId} />
            <RentEscalationTimeline storeId={storeId} />
            <PercentageRentCard storeId={storeId} />
          </>
        )}

        {activeTab === 'documents' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">
                Documents
              </p>
              <Link href={`/upload?store=${storeId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </Button>
              </Link>
            </div>
            <div className="space-y-2.5">
              {documents.map((doc) => (
                <DocumentListItem key={doc.id} doc={doc} />
              ))}
              {documents.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">No documents uploaded yet.</p>
              )}
            </div>
          </>
        )}

        {activeTab === 'chat' && (
          <div>
            {/* New Chat button */}
            <div className="mb-6">
              <Link href={`/chat?store=${storeId}`}>
                <Button
                  size="lg"
                  className="gap-2 text-white font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))',
                    border: '1px solid rgba(16,185,129,0.3)',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </Link>
            </div>

            {loadingConversations ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
              </div>
            ) : conversations.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-3">
                  Recent Conversations
                </p>
                <div className="space-y-1.5">
                  {conversations.map((conv) => {
                    const title = conv.title ?? 'Untitled conversation'
                    const date = relativeDate(conv.updated_at ?? conv.created_at)
                    return (
                      <Link
                        key={conv.id}
                        href={`/chat?store=${storeId}&conversation=${conv.id}`}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/[0.04] group"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <MessageSquare className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {date}
                            {conv.message_count != null && conv.message_count > 0 && (
                              <span className="ml-1.5">&middot; {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}</span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              </>
            ) : (
              /* Empty state with suggested questions */
              <div className="flex flex-col items-center justify-center py-16 space-y-5">
                <MessageSquare className="h-12 w-12 text-emerald-400/30" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">Ask Your Lease</p>
                  <p className="text-sm text-gray-400 mt-2 max-w-sm">
                    Ask questions about your lease and get AI-powered answers grounded in your actual documents.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <Link
                      key={q}
                      href={`/chat?store=${storeId}`}
                      className="text-sm px-4 py-2 rounded-full text-gray-300 transition-colors hover:text-emerald-300"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                    >
                      {q}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
