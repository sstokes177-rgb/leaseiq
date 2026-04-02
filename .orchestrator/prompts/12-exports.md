# Task 12: Export Features (PDF Downloads)

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth)
- Supabase clients: `createServerSupabaseClient()`, `createAdminSupabaseClient()` from `src/lib/supabase.ts`

### Styling Rules (MUST follow)
- Dark theme with emerald accents (#10b981)
- Font: Plus Jakarta Sans

---

## What This Task Must Do

Add PDF export capabilities for:
1. Lease summary
2. Chat history
3. Obligation matrix

### Step 1: Install jspdf

Run: `npm install jspdf`

Then add the type if needed: `npm install --save-dev @types/jspdf` (may not be needed as jspdf includes types)

**IMPORTANT**: Do NOT use html2canvas — it requires a browser DOM. Use jspdf directly to generate PDFs programmatically. This works in client-side JavaScript.

### Step 2: Create a PDF Generation Utility

Create `src/lib/pdfExport.ts`:

```typescript
import jsPDF from 'jspdf'

// ── Shared styles ───────────────────────────────────────────────────────────

const COLORS = {
  dark: [26, 29, 35] as [number, number, number],      // #1a1d23
  emerald: [16, 185, 129] as [number, number, number],  // #10b981
  white: [255, 255, 255] as [number, number, number],
  grey: [150, 150, 160] as [number, number, number],
  lightGrey: [200, 200, 210] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
}

function createPDF(title: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(...COLORS.dark)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(...COLORS.emerald)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('LeaseIQ', 15, 18)
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.lightGrey)
  doc.text(title, 55, 18)

  // Date
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.grey)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })}`, 15, 26)

  return doc
}

function addFooter(doc: jsPDF, pageNum: number) {
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.grey)
  doc.text(
    'LeaseIQ — Informational summary only. Not legal advice. Consult a licensed attorney.',
    15, pageHeight - 10
  )
  doc.text(`Page ${pageNum}`, 195, pageHeight - 10, { align: 'right' })
}

// ── Lease Summary Export ────────────────────────────────────────────────────

interface LeaseSummaryData {
  tenant_name: string | null
  landlord_name: string | null
  property_address: string | null
  suite_number: string | null
  lease_start_date: string | null
  lease_end_date: string | null
  base_rent_monthly: string | null
  rent_escalation: string | null
  security_deposit: string | null
  permitted_use: string | null
  lease_type: string | null
  renewal_options: string | null
  square_footage: string | null
}

export function exportLeaseSummary(summary: LeaseSummaryData, storeName: string) {
  const doc = createPDF('Lease Summary')
  let y = 40

  // Store name
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 50)
  doc.text(storeName, 15, y)
  y += 10

  // Section: Parties
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.emerald)
  doc.text('PARTIES', 15, y)
  y += 6

  const addField = (label: string, value: string | null) => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.grey)
    doc.text(label, 15, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 50)
    doc.text(value ?? 'Not specified', 65, y)
    y += 6
    if (y > 270) { doc.addPage(); addFooter(doc, doc.getNumberOfPages() - 1); y = 20 }
  }

  addField('Tenant:', summary.tenant_name)
  addField('Landlord:', summary.landlord_name)
  addField('Property:', summary.property_address)
  if (summary.suite_number) addField('Suite:', summary.suite_number)
  y += 4

  // Section: Lease Term
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.emerald)
  doc.text('LEASE TERM', 15, y)
  y += 6

  addField('Start Date:', summary.lease_start_date)
  addField('End Date:', summary.lease_end_date)
  addField('Lease Type:', summary.lease_type)
  addField('Square Footage:', summary.square_footage)
  y += 4

  // Section: Financials
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.emerald)
  doc.text('FINANCIALS', 15, y)
  y += 6

  addField('Base Rent:', summary.base_rent_monthly)
  addField('Security Deposit:', summary.security_deposit)
  addField('Rent Escalation:', summary.rent_escalation)
  addField('Renewal Options:', summary.renewal_options)
  y += 4

  if (summary.permitted_use) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.emerald)
    doc.text('PERMITTED USE', 15, y)
    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 50)
    const lines = doc.splitTextToSize(summary.permitted_use, 180)
    doc.text(lines, 15, y)
    y += lines.length * 4 + 4
  }

  addFooter(doc, 1)
  doc.save(`LeaseIQ_Summary_${storeName.replace(/\s+/g, '_')}.pdf`)
}

// ── Chat History Export ─────────────────────────────────────────────────────

interface ChatMessage {
  role: string
  content: string
  timestamp?: string
}

export function exportChatHistory(messages: ChatMessage[], storeName: string, title?: string) {
  const doc = createPDF('Chat History')
  let y = 40

  // Title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 50)
  doc.text(title ?? `${storeName} — Lease Q&A`, 15, y)
  y += 8

  let pageNum = 1

  for (const msg of messages) {
    const isUser = msg.role === 'user'

    // Role label
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(isUser ? 40 : ...COLORS.emerald)
    doc.text(isUser ? 'You:' : 'LeaseIQ:', 15, y)
    y += 5

    // Content
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 50)
    const lines = doc.splitTextToSize(msg.content, 175)

    for (const line of lines) {
      if (y > 270) {
        addFooter(doc, pageNum)
        doc.addPage()
        pageNum++
        y = 20
      }
      doc.text(line, 20, y)
      y += 4
    }

    y += 4 // spacing between messages
  }

  addFooter(doc, pageNum)
  doc.save(`LeaseIQ_Chat_${storeName.replace(/\s+/g, '_')}.pdf`)
}

// ── Obligation Matrix Export ────────────────────────────────────────────────

interface ObligationItem {
  category: string
  responsible: string
  article: string | null
  details: string | null
}

export function exportObligationMatrix(obligations: ObligationItem[], storeName: string) {
  const doc = createPDF('Obligation Matrix')
  let y = 40

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 50)
  doc.text(`${storeName} — Responsibility Matrix`, 15, y)
  y += 10

  // Table header
  doc.setFillColor(240, 240, 245)
  doc.rect(15, y - 4, 180, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 90)
  doc.text('Category', 17, y)
  doc.text('Responsible', 85, y)
  doc.text('Article', 125, y)
  doc.text('Details', 150, y)
  y += 8

  let pageNum = 1

  const RESPONSIBLE_COLORS: Record<string, [number, number, number]> = {
    Tenant: COLORS.emerald,
    Landlord: [99, 102, 241],
    Shared: COLORS.amber,
    'Not Addressed': COLORS.grey,
  }

  for (const item of obligations) {
    if (y > 270) {
      addFooter(doc, pageNum)
      doc.addPage()
      pageNum++
      y = 20
    }

    // Alternating row background
    doc.setFillColor(248, 248, 252)
    if (obligations.indexOf(item) % 2 === 0) {
      doc.rect(15, y - 4, 180, 8, 'F')
    }

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 50)
    doc.text(item.category, 17, y)

    const color = RESPONSIBLE_COLORS[item.responsible] ?? COLORS.grey
    doc.setTextColor(...color)
    doc.setFont('helvetica', 'bold')
    doc.text(item.responsible, 85, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 110)
    doc.text(item.article ?? '—', 125, y)

    if (item.details) {
      const detailLines = doc.splitTextToSize(item.details, 45)
      doc.text(detailLines[0] ?? '', 150, y)
    }

    y += 8
  }

  addFooter(doc, pageNum)
  doc.save(`LeaseIQ_Obligations_${storeName.replace(/\s+/g, '_')}.pdf`)
}
```

### Step 3: Add Export Buttons to Components

**LeaseSummaryCard** — Add a download button next to the regenerate button in `src/components/LeaseSummaryCard.tsx`:

```tsx
import { exportLeaseSummary } from '@/lib/pdfExport'
import { Download } from 'lucide-react'

// In the header section, next to Regenerate button:
<button
  onClick={() => exportLeaseSummary(summary, storeName)}
  title="Download as PDF"
  className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0"
>
  <Download className="h-3.5 w-3.5" />
  PDF
</button>
```

You'll need to pass the store name as a prop to LeaseSummaryCard, or fetch it from the store data.

**ObligationMatrixCard** — Add similar download button in `src/components/ObligationMatrixCard.tsx`:

```tsx
import { exportObligationMatrix } from '@/lib/pdfExport'
import { Download } from 'lucide-react'

// In the header, next to Regenerate:
<button
  onClick={() => exportObligationMatrix(obligations, storeName)}
  title="Download as PDF"
  className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0"
>
  <Download className="h-3.5 w-3.5" />
  PDF
</button>
```

**Chat Page** — Add a download button for chat history in `src/app/chat/page.tsx`:

```tsx
import { exportChatHistory } from '@/lib/pdfExport'
import { Download } from 'lucide-react'

// Add a download button in the chat header:
{messages.length > 0 && (
  <button
    onClick={() => {
      const chatMessages = messages.map(m => ({
        role: m.role,
        content: m.parts.filter(p => p.type === 'text').map(p => p.text).join(''),
      }))
      exportChatHistory(chatMessages, selectedStore?.store_name ?? 'Lease')
    }}
    title="Download chat as PDF"
    className="text-muted-foreground/50 hover:text-emerald-400 transition-colors p-2"
  >
    <Download className="h-4 w-4" />
  </button>
)}
```

### Step 4: Handle Store Name in Components

The export functions need the store name. Since the components receive `storeId` as a prop but not the store name, you have two options:

**Option A (recommended)**: Pass `storeName` as an additional prop from the location page:
```tsx
// In src/app/location/[id]/page.tsx:
<LeaseSummaryCard storeId={id} storeName={store.store_name} />
<ObligationMatrixCard storeId={id} storeName={store.store_name} />
```

Update the component interfaces to accept `storeName?: string`.

**Option B**: Fetch the store name inside each component using the stores API:
```tsx
const [storeName, setStoreName] = useState('Lease')
useEffect(() => {
  fetch('/api/stores').then(r => r.json()).then(data => {
    const s = (data.stores ?? []).find((s: any) => s.id === storeId)
    if (s) setStoreName(s.store_name)
  }).catch(() => {})
}, [storeId])
```

Go with Option A as it's simpler.

### Step 5: jspdf TypeScript Note

The `jsPDF` import may need adjustment. Check the installed version. The correct import for modern jspdf is:
```typescript
import jsPDF from 'jspdf'
```

If TypeScript complains, you may need:
```typescript
import { jsPDF } from 'jspdf'
```

### Step 6: Fix the Color Spread Issue

In the `exportChatHistory` function, the spread of `COLORS.emerald` into `setTextColor` won't work directly in a ternary. Fix this:

```typescript
if (isUser) {
  doc.setTextColor(40, 40, 50)
} else {
  doc.setTextColor(...COLORS.emerald)
}
```

---

## Files to Create

1. `src/lib/pdfExport.ts` — PDF generation utilities

## Files to Modify (read first)

1. `src/components/LeaseSummaryCard.tsx` — Add download button
2. `src/components/ObligationMatrixCard.tsx` — Add download button
3. `src/app/chat/page.tsx` — Add chat download button
4. `src/app/location/[id]/page.tsx` — Pass storeName prop to cards

## Dependencies to Install

```bash
npm install jspdf
```

---

Run `npx next build` to verify. Fix any errors.
