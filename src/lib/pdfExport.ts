import jsPDF from 'jspdf'

// ── Shared styles ───────────────────────────────────────────────────────────

const COLORS = {
  dark: [26, 29, 35] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
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
  doc.text('Provelo', 15, 18)
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
    'Provelo — Informational summary only. Not legal advice. Consult a licensed attorney.',
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
  doc.save(`Provelo_Summary_${storeName.replace(/\s+/g, '_')}.pdf`)
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
    if (isUser) {
      doc.setTextColor(40, 40, 50)
    } else {
      doc.setTextColor(...COLORS.emerald)
    }
    doc.text(isUser ? 'You:' : 'Provelo:', 15, y)
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
  doc.save(`Provelo_Chat_${storeName.replace(/\s+/g, '_')}.pdf`)
}

// ── Obligation Matrix Export ────────────────────────────────────────────────

interface ObligationExportItem {
  category: string
  responsible: string
  article: string | null
  details: string | null
}

export function exportObligationMatrix(obligations: ObligationExportItem[], storeName: string) {
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

  for (let idx = 0; idx < obligations.length; idx++) {
    const item = obligations[idx]
    if (y > 270) {
      addFooter(doc, pageNum)
      doc.addPage()
      pageNum++
      y = 20
    }

    // Alternating row background
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 252)
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
  doc.save(`Provelo_Obligations_${storeName.replace(/\s+/g, '_')}.pdf`)
}

// ── Dispute Letter Export ─────────────────────────────────────────────────

// ── Lease Comparison Export ────────────────────────────────────────────────

interface ComparisonExportItem {
  clause_affected: string
  original_text: string
  amended_text: string
  impact: 'favorable' | 'unfavorable' | 'neutral'
  significance: 'high' | 'medium' | 'low'
  explanation: string
}

export function exportLeaseComparison(
  comparisons: ComparisonExportItem[],
  summary: string,
  netImpact: string,
  storeName: string,
) {
  const doc = createPDF('Lease Comparison')
  let y = 40
  let pageNum = 1

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 50)
  doc.text(`${storeName} — Amendment Comparison`, 15, y)
  y += 8

  // Net impact badge
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const impactColor = netImpact === 'favorable' ? COLORS.emerald : netImpact === 'unfavorable' ? COLORS.red : COLORS.amber
  doc.setTextColor(...impactColor)
  doc.text(`Net Impact: ${netImpact.charAt(0).toUpperCase() + netImpact.slice(1)}`, 15, y)
  y += 6

  // Summary
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 90)
  const summaryLines = doc.splitTextToSize(summary, 180)
  doc.text(summaryLines, 15, y)
  y += summaryLines.length * 4 + 6

  doc.setFontSize(8)
  doc.setTextColor(...COLORS.grey)
  doc.text(`${comparisons.length} change${comparisons.length !== 1 ? 's' : ''} identified`, 15, y)
  y += 8

  const IMPACT_COLORS: Record<string, [number, number, number]> = {
    favorable: COLORS.emerald,
    unfavorable: COLORS.red,
    neutral: COLORS.grey,
  }

  for (const item of comparisons) {
    // Check page break (each item needs ~35mm)
    if (y > 240) {
      addFooter(doc, pageNum)
      doc.addPage()
      pageNum++
      y = 20
    }

    // Clause header with impact color
    const color = IMPACT_COLORS[item.impact] ?? COLORS.grey
    doc.setFillColor(...color)
    doc.rect(15, y - 3, 2, 12, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 50)
    doc.text(item.clause_affected, 20, y)

    // Impact + significance badges
    doc.setFontSize(7)
    doc.setTextColor(...color)
    const badge = `${item.impact.toUpperCase()} | ${item.significance.toUpperCase()}`
    doc.text(badge, 195, y, { align: 'right' })
    y += 6

    // Original text
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.grey)
    doc.text('Original:', 20, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 70)
    const origLines = doc.splitTextToSize(item.original_text, 145)
    doc.text(origLines, 45, y)
    y += origLines.length * 3.5 + 2

    // Amended text
    if (y > 270) { addFooter(doc, pageNum); doc.addPage(); pageNum++; y = 20 }
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.text('Amended:', 20, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 70)
    const amendLines = doc.splitTextToSize(item.amended_text, 145)
    doc.text(amendLines, 45, y)
    y += amendLines.length * 3.5 + 2

    // Explanation
    if (y > 270) { addFooter(doc, pageNum); doc.addPage(); pageNum++; y = 20 }
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 110)
    const expLines = doc.splitTextToSize(item.explanation, 170)
    doc.text(expLines, 20, y)
    y += expLines.length * 3.5 + 6
  }

  addFooter(doc, pageNum)
  doc.save(`Provelo_Comparison_${storeName.replace(/\s+/g, '_')}.pdf`)
}

// ── Dispute Letter Export ─────────────────────────────────────────────────

export function exportDisputeLetter(letterText: string, storeName: string) {
  const doc = createPDF('CAM Dispute Letter')
  let y = 40
  let pageNum = 1

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 50)

  const lines = doc.splitTextToSize(letterText, 175)

  for (const line of lines) {
    if (y > 270) {
      addFooter(doc, pageNum)
      doc.addPage()
      pageNum++
      y = 20
    }
    doc.text(line, 15, y)
    y += 4.5
  }

  addFooter(doc, pageNum)
  doc.save(`Provelo_CAM_Dispute_${storeName.replace(/\s+/g, '_')}.pdf`)
}
