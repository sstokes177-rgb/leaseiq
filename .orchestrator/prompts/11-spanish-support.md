# Task 11: Spanish Language Support

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)
- Claude API (claude-sonnet-4-6 for chat)
- Supabase (PostgreSQL + Auth)
- Font: Plus Jakarta Sans

### Styling Rules (MUST follow)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`
- Glass cards: `glass-card` class
- All existing UI styling must be preserved

### Existing Infrastructure
- `tenant_profiles.language_preference` column exists (TEXT, default 'en')
- `GET /api/settings` returns `{ profile: { language_preference } }`
- `PUT /api/settings` accepts `{ language_preference }`
- Settings page has a language selector (English/Spanish)
- Onboarding page exists at `src/app/onboarding/client.tsx`

---

## What This Task Must Do

Add Spanish language support throughout the app. When a user selects Spanish:
1. All UI labels, buttons, and text should display in Spanish
2. The AI chat should respond in Spanish
3. The language toggle should be available in settings AND onboarding

### Step 1: Create a Translation System

Create `src/lib/i18n.ts`:

```typescript
export type Language = 'en' | 'es'

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign out',
    'nav.back': 'Back',
    'nav.allLocations': 'All locations',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcomeBack': 'Welcome back',
    'dashboard.locations': 'locations in your portfolio',
    'dashboard.noLocations': 'Get started by adding your first location.',
    'dashboard.addLocation': 'Add Location',
    'dashboard.yourLocations': 'Your Locations',
    'dashboard.searchPlaceholder': 'Search locations by name, address, city...',
    'dashboard.noDocuments': 'No documents yet',
    'dashboard.documents': 'documents',

    // Location
    'location.uploadDocuments': 'Upload Documents',
    'location.uploadDescription': "Upload your lease, amendments, and addenda. We'll extract and index them for Q&A.",
    'location.askLease': 'Ask Your Lease',
    'location.askDescription': 'Ask anything in plain language. Get cited answers from your actual lease text.',
    'location.startChatting': 'Start chatting',
    'location.uploadFirst': 'Upload a lease first',
    'location.recentDocuments': 'Recent Documents',
    'location.criticalDates': 'Critical Dates',
    'location.actionNeeded': 'Action needed',
    'location.noDocumentsYet': 'No documents yet',
    'location.noDocsDescription': 'Upload your lease to unlock AI-powered analysis and Q&A.',
    'location.uploadYourLease': 'Upload your lease',

    // Chat
    'chat.askAnything': 'Ask anything about your lease',
    'chat.groundedIn': 'Answers are grounded in documents for',
    'chat.groundedGeneral': 'Questions are answered using the exact language from your uploaded documents.',
    'chat.exampleQuestions': 'Example questions',
    'chat.typeMessage': 'Type your message...',
    'chat.disclaimer': 'LeaseIQ provides informational summaries only — not legal advice. Consult a licensed attorney for legal interpretation.',
    'chat.responseDisclaimer': 'Informational summary based on your uploaded documents — not legal advice. Consult an attorney for legal interpretation.',

    // Lease Summary
    'summary.title': 'Lease Summary',
    'summary.subtitle': 'Key terms extracted from your documents',
    'summary.aiExtracted': 'AI-extracted from your documents',
    'summary.generate': 'Generate lease summary',
    'summary.generating': 'Generating summary…',
    'summary.regenerate': 'Regenerate',
    'summary.regenerating': 'Regenerating…',
    'summary.tenant': 'Tenant',
    'summary.landlord': 'Landlord',
    'summary.leaseTerm': 'Lease Term',
    'summary.leaseType': 'Lease Type',
    'summary.sqft': 'Square Footage',
    'summary.financials': 'Financials',
    'summary.baseRent': 'Base Rent',
    'summary.securityDeposit': 'Security Deposit',
    'summary.rentEscalation': 'Rent Escalation',
    'summary.renewalOptions': 'Renewal Options',
    'summary.permittedUse': 'Permitted Use',
    'summary.verifyNote': 'AI-extracted summary — verify key terms against your actual lease documents.',

    // Obligation Matrix
    'obligations.title': 'Obligation Matrix',
    'obligations.subtitle': 'Who is responsible for what',
    'obligations.generate': 'Generate obligation matrix',
    'obligations.generating': 'Analyzing lease obligations…',
    'obligations.yourResp': 'Your Responsibility',
    'obligations.landlordResp': "Landlord's Responsibility",
    'obligations.shared': 'Shared',
    'obligations.notAddressed': 'Not addressed in lease',

    // CAM
    'cam.title': 'CAM Charge Analysis',
    'cam.subtitle': 'Common area maintenance details',
    'cam.generate': 'Analyze CAM charges',
    'cam.generating': 'Analyzing CAM charges…',
    'cam.objectionWindow': 'CAM Objection Window',
    'cam.proRataShare': 'Pro-rata Share',
    'cam.adminFee': 'Admin Fee',
    'cam.camCap': 'CAM Cap',
    'cam.auditWindow': 'Audit Window',
    'cam.escalationLimit': 'Escalation Limit',
    'cam.included': 'Included in CAM',
    'cam.excluded': 'Excluded from CAM',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account and preferences',
    'settings.profile': 'Profile',
    'settings.profileDesc': 'Your account information',
    'settings.companyName': 'Company / Name',
    'settings.email': 'Email',
    'settings.language': 'Language',
    'settings.languageDesc': 'Choose your preferred language',
    'settings.notifications': 'Notifications',
    'settings.notificationsDesc': 'Choose what alerts you receive',
    'settings.save': 'Save Changes',
    'settings.saving': 'Saving...',
    'settings.saved': 'Saved',

    // Common
    'common.loading': 'Loading…',
    'common.pdfOrWord': 'PDF or Word',
    'common.aiPoweredQA': 'AI-powered Q&A',
    'common.days': 'days',
    'common.passed': 'Passed',
    'common.today': 'Today',
  },

  es: {
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.settings': 'Configuración',
    'nav.signOut': 'Cerrar sesión',
    'nav.back': 'Volver',
    'nav.allLocations': 'Todas las ubicaciones',

    // Dashboard
    'dashboard.title': 'Panel',
    'dashboard.welcomeBack': 'Bienvenido de nuevo',
    'dashboard.locations': 'ubicaciones en su portafolio',
    'dashboard.noLocations': 'Comience agregando su primera ubicación.',
    'dashboard.addLocation': 'Agregar Ubicación',
    'dashboard.yourLocations': 'Sus Ubicaciones',
    'dashboard.searchPlaceholder': 'Buscar ubicaciones por nombre, dirección, ciudad...',
    'dashboard.noDocuments': 'Sin documentos aún',
    'dashboard.documents': 'documentos',

    // Location
    'location.uploadDocuments': 'Subir Documentos',
    'location.uploadDescription': 'Suba su contrato de arrendamiento, enmiendas y anexos. Los extraeremos e indexaremos para preguntas y respuestas.',
    'location.askLease': 'Pregunte Sobre Su Contrato',
    'location.askDescription': 'Pregunte cualquier cosa en lenguaje simple. Obtenga respuestas citadas de su texto real del contrato.',
    'location.startChatting': 'Comenzar a chatear',
    'location.uploadFirst': 'Suba un contrato primero',
    'location.recentDocuments': 'Documentos Recientes',
    'location.criticalDates': 'Fechas Críticas',
    'location.actionNeeded': 'Acción necesaria',
    'location.noDocumentsYet': 'Sin documentos aún',
    'location.noDocsDescription': 'Suba su contrato para activar el análisis con IA y preguntas y respuestas.',
    'location.uploadYourLease': 'Suba su contrato',

    // Chat
    'chat.askAnything': 'Pregunte cualquier cosa sobre su contrato',
    'chat.groundedIn': 'Las respuestas se basan en los documentos de',
    'chat.groundedGeneral': 'Las preguntas se responden usando el lenguaje exacto de sus documentos subidos.',
    'chat.exampleQuestions': 'Preguntas de ejemplo',
    'chat.typeMessage': 'Escriba su mensaje...',
    'chat.disclaimer': 'LeaseIQ proporciona resúmenes informativos solamente — no es asesoría legal. Consulte a un abogado licenciado para interpretación legal.',
    'chat.responseDisclaimer': 'Resumen informativo basado en sus documentos subidos — no es asesoría legal. Consulte a un abogado para interpretación legal.',

    // Lease Summary
    'summary.title': 'Resumen del Contrato',
    'summary.subtitle': 'Términos clave extraídos de sus documentos',
    'summary.aiExtracted': 'Extraído por IA de sus documentos',
    'summary.generate': 'Generar resumen del contrato',
    'summary.generating': 'Generando resumen…',
    'summary.regenerate': 'Regenerar',
    'summary.regenerating': 'Regenerando…',
    'summary.tenant': 'Arrendatario',
    'summary.landlord': 'Arrendador',
    'summary.leaseTerm': 'Plazo del Contrato',
    'summary.leaseType': 'Tipo de Contrato',
    'summary.sqft': 'Pies Cuadrados',
    'summary.financials': 'Finanzas',
    'summary.baseRent': 'Renta Base',
    'summary.securityDeposit': 'Depósito de Seguridad',
    'summary.rentEscalation': 'Escalamiento de Renta',
    'summary.renewalOptions': 'Opciones de Renovación',
    'summary.permittedUse': 'Uso Permitido',
    'summary.verifyNote': 'Resumen extraído por IA — verifique los términos clave contra sus documentos reales.',

    // Obligation Matrix
    'obligations.title': 'Matriz de Obligaciones',
    'obligations.subtitle': 'Quién es responsable de qué',
    'obligations.generate': 'Generar matriz de obligaciones',
    'obligations.generating': 'Analizando obligaciones del contrato…',
    'obligations.yourResp': 'Su Responsabilidad',
    'obligations.landlordResp': 'Responsabilidad del Arrendador',
    'obligations.shared': 'Compartida',
    'obligations.notAddressed': 'No abordado en el contrato',

    // CAM
    'cam.title': 'Análisis de Cargos CAM',
    'cam.subtitle': 'Detalles de mantenimiento de áreas comunes',
    'cam.generate': 'Analizar cargos CAM',
    'cam.generating': 'Analizando cargos CAM…',
    'cam.objectionWindow': 'Ventana de Objeción CAM',
    'cam.proRataShare': 'Parte Proporcional',
    'cam.adminFee': 'Tarifa Administrativa',
    'cam.camCap': 'Tope CAM',
    'cam.auditWindow': 'Ventana de Auditoría',
    'cam.escalationLimit': 'Límite de Escalamiento',
    'cam.included': 'Incluido en CAM',
    'cam.excluded': 'Excluido de CAM',

    // Settings
    'settings.title': 'Configuración',
    'settings.subtitle': 'Administre su cuenta y preferencias',
    'settings.profile': 'Perfil',
    'settings.profileDesc': 'Información de su cuenta',
    'settings.companyName': 'Empresa / Nombre',
    'settings.email': 'Correo electrónico',
    'settings.language': 'Idioma',
    'settings.languageDesc': 'Elija su idioma preferido',
    'settings.notifications': 'Notificaciones',
    'settings.notificationsDesc': 'Elija qué alertas recibir',
    'settings.save': 'Guardar Cambios',
    'settings.saving': 'Guardando...',
    'settings.saved': 'Guardado',

    // Common
    'common.loading': 'Cargando…',
    'common.pdfOrWord': 'PDF o Word',
    'common.aiPoweredQA': 'Preguntas y respuestas con IA',
    'common.days': 'días',
    'common.passed': 'Pasado',
    'common.today': 'Hoy',
  },
}

export function t(key: string, lang: Language = 'en'): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key
}
```

### Step 2: Create a Language Context Provider

Create `src/components/LanguageProvider.tsx`:

```tsx
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
```

### Step 3: Wrap the App in LanguageProvider

In `src/app/layout.tsx`, wrap the children with the LanguageProvider. Since layout.tsx is a server component, you need to create a client wrapper:

Create `src/components/ClientProviders.tsx`:
```tsx
'use client'
import { LanguageProvider } from './LanguageProvider'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
```

Then in `src/app/layout.tsx`, wrap children:
```tsx
import { ClientProviders } from '@/components/ClientProviders'

// In the body:
<ClientProviders>{children}</ClientProviders>
```

### Step 4: Update the Chat to Respond in the User's Language

In `src/app/api/chat/route.ts`, modify the system prompt based on language preference:

1. Fetch the user's language preference from `tenant_profiles`
2. If language is 'es', append to the system prompt:
```
IMPORTANT: The user prefers Spanish. You MUST respond entirely in Spanish. Use clear, professional Spanish. Translate all lease terminology appropriately (e.g., "tenant" = "arrendatario", "landlord" = "arrendador", "lease" = "contrato de arrendamiento").
```

### Step 5: Add Language Toggle to Onboarding

In `src/app/onboarding/client.tsx`, add a language selection step (or inline toggle) before or during the onboarding form:

```tsx
<div className="flex gap-2 justify-center mb-6">
  <button
    onClick={() => setLanguage('en')}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      language === 'en' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-white/40 hover:text-white/60'
    }`}
  >
    🇺🇸 English
  </button>
  <button
    onClick={() => setLanguage('es')}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      language === 'es' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-white/40 hover:text-white/60'
    }`}
  >
    🇪🇸 Español
  </button>
</div>
```

### Step 6: Update Key Client Components to Use Translations

For CLIENT components that show user-facing text, use the `useLanguage` hook:

```tsx
import { useLanguage } from '@/components/LanguageProvider'

function MyComponent() {
  const { t } = useLanguage()
  return <p>{t('summary.title')}</p>
}
```

Update these components:
1. `src/components/LeaseSummaryCard.tsx` — All labels
2. `src/components/ObligationMatrixCard.tsx` — All labels
3. `src/components/CamAnalysisCard.tsx` — All labels
4. `src/components/ChatMessage.tsx` — Disclaimer text
5. `src/app/chat/page.tsx` — Chat interface text
6. `src/components/DashboardGrid.tsx` — Search placeholder, filter labels

**NOTE**: Server components (like `src/app/dashboard/page.tsx`) cannot use `useLanguage()` since they run on the server. For server components, keep the English text — the important user-facing text is mostly in client components. If needed, pass the language as a prop from a client wrapper.

### Step 7: Update Example Chat Questions for Spanish

In `src/app/chat/page.tsx`, create Spanish versions of example questions:

```typescript
const EXAMPLE_QUESTIONS_ES = [
  '¿Quién es responsable de las reparaciones de HVAC?',
  '¿Puedo subarrendar parte de mi espacio?',
  '¿Cuáles son mis opciones de terminación anticipada?',
  '¿Cuándo es mi próximo aumento de renta y por cuánto?',
  '¿Puedo poner un letrero en mi fachada?',
  '¿Qué pasa si me atraso en la renta?',
]
```

Use the appropriate list based on the language preference.

---

## Files to Create

1. `src/lib/i18n.ts` — Translation dictionary and `t()` function
2. `src/components/LanguageProvider.tsx` — Language context provider
3. `src/components/ClientProviders.tsx` — Client wrapper for providers

## Files to Modify (read first)

1. `src/app/layout.tsx` — Wrap with ClientProviders
2. `src/app/api/chat/route.ts` — Add Spanish prompt instruction
3. `src/app/chat/page.tsx` — Use translations, Spanish example questions
4. `src/components/LeaseSummaryCard.tsx` — Use translations
5. `src/components/ObligationMatrixCard.tsx` — Use translations
6. `src/components/CamAnalysisCard.tsx` — Use translations
7. `src/components/ChatMessage.tsx` — Translate disclaimer
8. `src/app/onboarding/client.tsx` — Add language toggle

---

Run `npx next build` to verify. Fix any errors.
