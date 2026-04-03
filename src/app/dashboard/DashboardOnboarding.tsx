'use client'

import { useCallback } from 'react'
import { OnboardingChecklist } from '@/components/OnboardingChecklist'
import { WelcomeTour } from '@/components/WelcomeTour'

interface DashboardOnboardingProps {
  firstStoreId: string | null
}

export function DashboardOnboarding({ firstStoreId }: DashboardOnboardingProps) {
  const handleAddLocation = useCallback(() => {
    // Click the existing AddStoreButton on the page
    const btn = document.getElementById('add-store-btn')
    if (btn) btn.click()
  }, [])

  return (
    <>
      <OnboardingChecklist
        onAddLocation={handleAddLocation}
        firstStoreId={firstStoreId}
      />
      <WelcomeTour />
    </>
  )
}
