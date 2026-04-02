'use client'

import { LanguageProvider } from './LanguageProvider'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
