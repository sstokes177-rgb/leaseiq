'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Upload, ArrowRight,
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

export function LocationTabs({ storeId, storeName, hasDocuments, documents }: LocationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  if (!hasDocuments) return null

  return (
    <>
      {/* Tab bar — sticky below header */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 border-b border-white/[0.06]" style={{ background: 'rgba(8,10,16,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="space-y-6 sm:space-y-8">
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
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <MessageSquare className="h-12 w-12 text-emerald-400/30" />
            <p className="text-lg font-semibold text-white">Ask Your Lease</p>
            <p className="text-sm text-gray-400 text-center max-w-sm">
              Ask questions about your lease and get AI-powered answers grounded in your actual documents.
            </p>
            <Link href={`/chat?store=${storeId}`}>
              <Button
                size="lg"
                className="gap-2 text-white font-semibold"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))',
                  border: '1px solid rgba(16,185,129,0.3)',
                }}
              >
                <MessageSquare className="h-5 w-5" />
                Open Chat
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
