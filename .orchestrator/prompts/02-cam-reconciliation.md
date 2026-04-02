# Task 02: CAM Reconciliation Assistant

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — use `generateText` from `ai` and `anthropic` from `@ai-sdk/anthropic`
- Claude API: `claude-sonnet-4-6` for complex analysis, `claude-haiku-4-5-20251001` for extraction
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- pdf-parse for PDF text extraction (server-only, in `next.config.ts` serverExternalPackages)

### Styling Rules (MUST follow exactly)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`, highlights `rgba(16,185,129,...)`
- Font: Plus Jakarta Sans
- Glass cards: `glass-card` class (bg rgba(255,255,255,0.04), backdrop-blur-24px, border rgba(255,255,255,0.07))
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Values: `text-sm text-white/85`
- Icon containers: `w-9 h-9 rounded-xl` with tinted bg and border

### Existing Infrastructure
- `cam_reconciliations` table exists (from migration 003):
  ```sql
  CREATE TABLE IF NOT EXISTS cam_reconciliations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    statement_file_name TEXT,
    reconciliation_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `CamReconciliationData` type exists in `src/types/index.ts`:
  ```typescript
  interface CamReconciliationData {
    total_billed: string | null
    potential_overcharges: Array<{
      item: string
      billed_amount: string
      expected_amount: string
      difference: string
      reason: string
    }>
    total_potential_savings: string | null
    recommendation: string | null
  }
  ```

### Existing Files (READ these first — they may already have partial implementations)
- `src/app/api/cam-reconciliation/route.ts` — GET and POST handlers
- `src/components/CamReconciliationCard.tsx` — UI component
- `src/lib/camAnalysis.ts` — CAM analysis extraction (the reconciliation needs this data)

---

## What This Task Must Do

Verify and complete the CAM Reconciliation Assistant. This feature allows tenants to:
1. Upload a CAM reconciliation statement PDF
2. Extract text from the statement
3. Compare the statement charges against the lease's CAM provisions (from `cam_analysis`)
4. Flag potential overcharges with amounts, reasons, and expected values
5. Display results in a clear table

### Step 1: Verify the POST API Route

Read `src/app/api/cam-reconciliation/route.ts`. The POST handler should:

1. Authenticate the user
2. Accept a multipart form upload (the CAM statement PDF) with `store_id`
3. Extract text from the uploaded PDF using `pdf-parse`
4. Fetch the existing CAM analysis from the `cam_analysis` table for this store
5. Send both the statement text and CAM analysis to Claude for comparison
6. Store results in `cam_reconciliations` table
7. Return the reconciliation data

If the POST handler is incomplete or broken, implement/fix it:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const storeId = formData.get('store_id') as string | null

  if (!file || !storeId) {
    return NextResponse.json({ error: 'File and store_id required' }, { status: 400 })
  }

  // Verify store belongs to user
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Extract text from PDF
  let statementText: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    statementText = result.text
  } catch (err) {
    console.error('[CAM Reconciliation] PDF extraction failed:', err)
    return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 422 })
  }

  if (!statementText || statementText.trim().length < 50) {
    return NextResponse.json({ error: 'Could not extract meaningful text from the uploaded file' }, { status: 422 })
  }

  // Fetch existing CAM analysis for context
  const admin = createAdminSupabaseClient()
  const { data: camAnalysis } = await admin
    .from('cam_analysis')
    .select('analysis_data')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  const camContext = camAnalysis?.analysis_data
    ? `\n\nLease CAM Provisions:\n${JSON.stringify(camAnalysis.analysis_data, null, 2)}`
    : '\n\nNo CAM analysis from lease available — analyze the statement on its own.'

  // Send to Claude for reconciliation analysis
  let reconciliationData
  try {
    const { text: result } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      maxOutputTokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a CAM (Common Area Maintenance) reconciliation specialist for commercial retail tenants.

Analyze this CAM reconciliation statement and compare it against the tenant's lease provisions. Identify any potential overcharges, errors, or items that don't comply with the lease terms.
${camContext}

CAM Reconciliation Statement text:
${statementText.slice(0, 25000)}

Return ONLY valid JSON with exactly these keys:
{
  "total_billed": "string — total amount billed in the statement, e.g. $45,230.00",
  "potential_overcharges": [
    {
      "item": "name of the charge category",
      "billed_amount": "amount charged",
      "expected_amount": "what you'd expect based on lease terms (or 'N/A' if cannot determine)",
      "difference": "the overcharge amount",
      "reason": "one sentence explaining why this is a potential overcharge"
    }
  ],
  "total_potential_savings": "string — sum of all overcharge differences, e.g. $3,450.00",
  "recommendation": "string — 2-3 sentence recommendation for the tenant"
}

Common overcharge issues to look for:
- Capital improvements charged as operating expenses
- Admin fee percentage exceeding lease-specified rate
- Charges for items explicitly excluded in the lease
- Proportionate share calculated incorrectly
- Management fees above market rate
- Insurance cost increases beyond lease caps
- Charges for tenant-specific improvements billed to all tenants
- Year-over-year increases exceeding any CAM cap

If no overcharges are found, return an empty array for potential_overcharges and note in the recommendation that the statement appears compliant.`,
      }],
    })

    reconciliationData = JSON.parse(result.trim().replace(/^```json\s*|\s*```$/g, ''))
  } catch (err) {
    console.error('[CAM Reconciliation] Claude analysis failed:', err)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }

  // Store results
  try {
    await admin.from('cam_reconciliations').insert({
      store_id: storeId,
      tenant_id: user.id,
      statement_file_name: file.name,
      reconciliation_data: reconciliationData,
    })
  } catch (err) {
    console.error('[CAM Reconciliation] DB write failed:', err)
    // Still return the data even if storage fails
  }

  return NextResponse.json({
    success: true,
    reconciliation: reconciliationData,
    file_name: file.name,
  })
}
```

### Step 2: Verify the GET API Route

The GET handler should fetch the most recent reconciliation results:

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('cam_reconciliations')
    .select('*')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ reconciliations: [] })
  return NextResponse.json({ reconciliations: data ?? [] })
}
```

### Step 3: Verify and Enhance the CamReconciliationCard Component

Read `src/components/CamReconciliationCard.tsx`. It should:

1. Fetch existing reconciliation results on mount
2. Show an upload area for the CAM statement PDF
3. Submit the file to POST `/api/cam-reconciliation`
4. Display results in a table format

Ensure the component has:

**Upload Section:**
- A file drop zone or file input accepting PDFs only
- A button to submit the uploaded file
- Loading state while analysis runs

**Results Display:**
- Total billed amount (prominent)
- Total potential savings (highlighted in emerald/red)
- A table of potential overcharges with columns: Item, Billed, Expected, Difference, Reason
- Recommendation text
- Statement file name and date

**History:**
- Show previous reconciliation results (from GET endpoint)

Here's the component structure to verify/implement:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Upload, Receipt, AlertTriangle, CheckCircle, FileText } from 'lucide-react'
import type { CamReconciliationData } from '@/types'

interface CamReconciliationCardProps {
  storeId: string
}

interface ReconciliationRecord {
  id: string
  statement_file_name: string | null
  reconciliation_data: CamReconciliationData
  created_at: string
}

export function CamReconciliationCard({ storeId }: CamReconciliationCardProps) {
  const [records, setRecords] = useState<ReconciliationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Fetch existing reconciliations
  useEffect(() => {
    fetch(`/api/cam-reconciliation?store_id=${storeId}`)
      .then(r => r.json())
      .then(data => setRecords(data.reconciliations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeId])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('store_id', storeId)

      const res = await fetch('/api/cam-reconciliation', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok && data.reconciliation) {
        setRecords(prev => [{
          id: crypto.randomUUID(),
          statement_file_name: data.file_name,
          reconciliation_data: data.reconciliation,
          created_at: new Date().toISOString(),
        }, ...prev])
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setError(data.error ?? 'Analysis failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // ... render with glass-card styling, amber icon theme
}
```

Use amber color theme for the icon (matching CamAnalysisCard):
- Icon bg: `rgba(245,158,11,0.10)`, border: `rgba(245,158,11,0.20)`
- Icon: `Receipt` from lucide-react, `text-amber-400`

For the overcharges table, use:
- Each row as a rounded-lg card with subtle background
- Red-tinted amounts for overcharges
- Green checkmark if no overcharges found

### Step 4: Verify Location Page Integration

Read `src/app/location/[id]/page.tsx` and verify `<CamReconciliationCard storeId={id} />` is rendered. It should already be there after the CamAnalysisCard.

---

## Files to Create or Modify

### Modify (read first):
1. `src/app/api/cam-reconciliation/route.ts` — Verify/fix GET and POST
2. `src/components/CamReconciliationCard.tsx` — Verify/enhance UI

### Check (read only, fix if broken):
1. `src/app/location/[id]/page.tsx` — Verify card is rendered
2. `src/types/index.ts` — Verify CamReconciliationData type
3. `supabase/migrations/003_cam_and_features.sql` — Verify table exists

---

Run `npx next build` to verify. Fix any errors.
