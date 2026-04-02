'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type Language, t as translate } from '@/lib/i18n'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function useLanguage() {
  return useContext(LanguageContext)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')
  const [loaded, setLoaded] = useState(false)

  // Fetch language preference from API on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        const pref = data.profile?.language_preference
        if (pref === 'es') setLangState('es')
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    // Persist to API (fire and forget)
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language_preference: newLang }),
    }).catch(() => {})
  }

  const tFn = (key: string) => translate(key, lang)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tFn }}>
      {children}
    </LanguageContext.Provider>
  )
}
