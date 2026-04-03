'use client'

import { useState } from 'react'
import { RiskScoreCard } from '@/components/RiskScoreCard'
import { CitationSidePanel } from '@/components/CitationSidePanel'
import type { Citation } from '@/types'

interface LocationRiskSectionProps {
  storeId: string
}

export function LocationRiskSection({ storeId }: LocationRiskSectionProps) {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null)

  return (
    <>
      <RiskScoreCard
        storeId={storeId}
        onArticleClick={setActiveCitation}
      />
      <CitationSidePanel
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </>
  )
}
