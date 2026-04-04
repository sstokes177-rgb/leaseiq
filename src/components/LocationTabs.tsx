'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Upload, ChevronRight, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeaseSummaryCard } from '@/components/LeaseSummaryCard'
import { ObligationMatrixCard } from '@/components/ObligationMatrixCard'
import { CamAnalysisCard } from '@/components/CamAnalysisCard'
import { CamReconciliationCard } from '@/components/CamReconciliationCard'
import { CamAuditCard } from '@/components/CamAuditCard'
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
      {/* Tab bar — underline style, left-aligned, sticky */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mt-4 mb-6 border-b border-white/[0.06] backdrop-blur-xl">
        <div className="flex overflow-x-auto scrollbar-none -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                window.dispatchEvent(new CustomEvent('location-tab-change', { detail: { tab: tab.key } }))
              }}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.key
                  ? 'text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
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
            <CamAuditCard storeId={storeId} storeName={storeName} />
            <OccupancyCostCard storeId={storeId} />
            <RentEscalationTimeline storeId={storeId} />
            <PercentageRentCard storeId={storeId} />
          </>
        )}

        {activeTab === 'documents' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Documents
              </p>
              <Link href={`/upload?store=${storeId}`}>
                <Button
                  variant="outline"
                  className="gap-1.5 text-sm px-4 py-2"
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
          <div className="min-h-[50vh]">
            {/* New Chat button */}
            <div className="mb-6">
              <Link href={`/chat?store=${storeId}`}>
                <Button className="gap-2 text-white font-medium px-5 py-2.5 text-sm">
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </Link>
            </div>

            {loadingConversations ? (
              <div className="space-y-3 animate-pulse">
                {[0, 1, 2].map(i => (
                  <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-white/[0.06]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-48 rounded bg-white/[0.06]" />
                        <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Recent Conversations
                </p>
                <div className="space-y-2">
                  {conversations.map((conv) => {
                    const title = conv.title ?? 'Untitled conversation'
                    const date = relativeDate(conv.updated_at ?? conv.created_at)
                    return (
                      <Link
                        key={conv.id}
                        href={`/chat?store=${storeId}&conversation=${conv.id}`}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] transition-colors hover:bg-white/[0.05] hover:border-white/[0.1] group"
                      >
                        <MessageSquare className="h-4 w-4 text-gray-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
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
              /* Empty state — fills available space */
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
                <div className="flex flex-col items-center justify-center py-12 space-y-5">
                  <MessageSquare className="h-10 w-10 text-emerald-400/30" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-white">Ask Your Lease</p>
                    <p className="text-sm text-gray-400 mt-1.5 max-w-sm">
                      Get AI-powered answers grounded in your actual lease documents.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <Link
                        key={q}
                        href={`/chat?store=${storeId}`}
                        className="text-sm px-4 py-2 rounded-full text-gray-300 transition-colors hover:text-emerald-300 hover:border-emerald-500/30 bg-white/[0.03] border border-white/[0.06]"
                      >
                        {q}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
