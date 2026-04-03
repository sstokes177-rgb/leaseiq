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

// ── Risk Score Export ──────────────────────────────────────────────────────

interface RiskScoreExportData {
  overall_score: number
  clause_scores: Array<{
    clause: string
    category: string
    severity: 'red' | 'yellow' | 'green'
    summary: string
    citation: string | null
    recommendation: string | null
  }>
  top_3_priorities: Array<{
    clause: string
    current_risk: 'red' | 'yellow' | 'green'
    why_it_matters: string
    what_to_negotiate: string
    suggested_language: string
  }>
}

export function exportRiskScore(data: RiskScoreExportData, storeName: string) {
  const doc = createPDF('Risk Score Report')
  let y = 40
  let pageNum = 1

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 50)
  doc.text(`${storeName} — Lease Risk Report`, 15, y)
  y += 10

  // Overall score
  const scoreColor = data.overall_score >= 80 ? COLORS.emerald : data.overall_score >= 50 ? COLORS.amber : COLORS.red
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...scoreColor)
  doc.text(String(data.overall_score), 15, y + 8)
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.grey)
  doc.text('/ 100', 40, y + 8)
  doc.setFontSize(8)
  doc.text(
    data.overall_score >= 80 ? 'Excellent — strong tenant protections' :
    data.overall_score >= 50 ? 'Fair — some areas need attention' :
    'Critical — several high-risk clauses detected',
    60, y + 8
  )
  y += 20

  // Clause scores
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.emerald)
  doc.text('CLAUSE RATINGS', 15, y)
  y += 7

  const SEVERITY_LABELS: Record<string, string> = { red: 'HIGH RISK', yellow: 'MODERATE', green: 'LOW RISK' }
  const SEVERITY_COLORS: Record<string, [number, number, number]> = { red: COLORS.red, yellow: COLORS.amber, green: COLORS.emerald }

  for (const clause of data.clause_scores) {
    if (y > 260) { addFooter(doc, pageNum); doc.addPage(); pageNum++; y = 20 }

    const color = SEVERITY_COLORS[clause.severity] ?? COLORS.grey
    doc.setFillColor(...color)
    doc.rect(15, y - 3, 2, 10, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 50)
    doc.text(clause.clause, 20, y)

    doc.setFontSize(7)
    doc.setTextColor(...color)
    doc.text(SEVERITY_LABELS[clause.severity] ?? '', 195, y, { align: 'right' })
    y += 4

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 90)
    const summaryLines = doc.splitTextToSize(clause.summary, 170)
    doc.text(summaryLines, 20, y)
    y += summaryLines.length * 3.5 + 2

    if (clause.recommendation) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 110)
      const recLines = doc.splitTextToSize(`Recommendation: ${clause.recommendation}`, 170)
      doc.text(recLines, 20, y)
      y += recLines.length * 3.5 + 2
    }

    y += 3
  }

  // Top 3 priorities
  if (data.top_3_priorities.length > 0) {
    if (y > 220) { addFooter(doc, pageNum); doc.addPage(); pageNum++; y = 20 }

    y += 4
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.emerald)
    doc.text('TOP NEGOTIATION PRIORITIES', 15, y)
    y += 8

    for (let i = 0; i < data.top_3_priorities.length; i++) {
      const priority = data.top_3_priorities[i]
      if (y > 240) { addFooter(doc, pageNum); doc.addPage(); pageNum++; y = 20 }

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 50)
      doc.text(`${i + 1}. ${priority.clause}`, 15, y)
      y += 5

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 90)
      const whyLines = doc.splitTextToSize(`Why it matters: ${priority.why_it_matters}`, 175)
      doc.text(whyLines, 20, y)
      y += whyLines.length * 3.5 + 2

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 70)
      const whatLines = doc.splitTextToSize(`Negotiate: ${priority.what_to_negotiate}`, 175)
      doc.text(whatLines, 20, y)
      y += whatLines.length * 3.5 + 2

      if (priority.suggested_language) {
        if (y > 260) { addFooter(doc, pageNum); doc.addPage(); pageNum++; y = 20 }
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 110)
        const langLines = doc.splitTextToSize(`Suggested language: "${priority.suggested_language}"`, 170)
        doc.text(langLines, 20, y)
        y += langLines.length * 3.5 + 2
      }

      y += 4
    }
  }

  addFooter(doc, pageNum)
  doc.save(`Provelo_Risk_Report_${storeName.replace(/\s+/g, '_')}.pdf`)
}

// ── CAM Audit Export ──────────────────────────────────────────────────────

interface CamAuditExportData {
  statement_file_name: string
  total_potential_overcharge: number
  audit_date: string
  dispute_deadline: string | null
  findings: Array<{
    rule_name: string
    status: 'violation_found' | 'within_limits' | 'insufficient_data'
    estimated_overcharge: number
    explanation: string
    lease_reference: string | null
    statement_reference: string | null
  }>
  dispute_letter?: string | null
}

export function exportCamAudit(data: CamAuditExportData, storeName: string) {
  const doc = createPDF('CAM Forensic Audit')
  let y = 40
  let pageNum = 1

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 50)
  doc.text(`${storeName} — CAM Forensic Audit Report`, 15, y)
  y += 8

  // Summary header
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.grey)
  doc.text(`Statement: ${data.statement_file_name}`, 15, y)
  y += 4
  doc.text(`Audit date: ${new Date(data.audit_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 15, y)
  y += 4
  if (data.dispute_deadline) {
    doc.text(`Dispute deadline: ${new Date(data.dispute_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 15, y)
    y += 4
  }
  y += 4

  // Total overcharge banner
  const overchargeColor = data.total_potential_overcharge > 0 ? COLORS.red : COLORS.emerald
  doc.setFillColor(245, 245, 250)
  doc.rect(15, y - 4, 180, 16, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.grey)
  doc.text('TOTAL POTENTIAL OVERCHARGE', 17, y)
  y += 6
  doc.setFontSize(16)
  doc.setTextColor(...overchargeColor)
  doc.text(`$${data.total_potential_overcharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 17, y)
  y += 10

  // Findings count
  const violations = data.findings.filter(f => f.status === 'violation_found')
  const ok = data.findings.filter(f => f.status === 'within_limits')
  const noData = data.findings.filter(f => f.status === 'insufficient_data')

  doc.setFontSize(8)
  doc.setTextColor(80, 80, 90)
  doc.text(`${violations.length} violation${violations.length !== 1 ? 's' : ''} · ${ok.length} within limits · ${noData.length} insufficient data`, 15, y)
  y += 8

  // Findings detail
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.emerald)
  doc.text('FINDINGS', 15, y)
  y += 7

  const STATUS_LABELS: Record<string, string> = { violation_found: 'VIOLATION', within_limits: 'OK', insufficient_data: 'NO DATA' }
  const STATUS_COLORS: Record<string, [number, number, number]> = { violation_found: COLORS.red, within_limits: COLORS.emerald, insufficient_data: COLORS.grey }

  for (const finding of data.findings) {
    if (y > 255) { addFooter(doc, pageNum); doc.addPage(); pageNum++; y = 20 }

    const color = STATUS_COLORS[finding.status] ?? COLORS.grey
    doc.setFillColor(...color)
    doc.rect(15, y - 3, 2, 10, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 50)
    doc.text(finding.rule_name, 20, y)

    // Status + amount
    const label = STATUS_LABELS[finding.status] ?? ''
    const amount = finding.estimated_overcharge > 0
      ? `$${finding.estimated_overcharge.toLocaleString('en-US', { minimumFractionDigits: 2 })} `
      : ''
    doc.setFontSize(7)
    doc.setTextColor(...color)
    doc.text(`${amount}${label}`, 195, y, { align: 'right' })
    y += 4.5

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 90)
    const expLines = doc.splitTextToSize(finding.explanation, 170)
    doc.text(expLines, 20, y)
    y += expLines.length * 3.5 + 4
  }

  // Dispute letter
  if (data.dispute_letter) {
    addFooter(doc, pageNum)
    doc.addPage()
    pageNum++
    y = 20

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.emerald)
    doc.text('DISPUTE LETTER', 15, y)
    y += 7

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 50)
    const letterLines = doc.splitTextToSize(data.dispute_letter, 175)
    for (const line of letterLines) {
      if (y > 270) { addFooter(doc, pageNum); doc.addPage(); pageNum++; y = 20 }
      doc.text(line, 15, y)
      y += 4
    }
  }

  addFooter(doc, pageNum)
  doc.save(`Provelo_CAM_Audit_${storeName.replace(/\s+/g, '_')}.pdf`)
}

// ── Portfolio CSV Export ───────────────────────────────────────────────────

interface PortfolioExportRow {
  store_name: string
  address: string | null
  risk_score: number | null
  lease_expiry: string | null
  annual_rent: number | null
  rent_per_sf: number | null
  top_risk: string | null
  square_footage: number | null
}

export function exportPortfolioCSV(locations: PortfolioExportRow[]) {
  const headers = ['Location', 'Address', 'Risk Score', 'Lease Expiry', 'Annual Rent', 'Rent/SF', 'Top Risk', 'Sq Ft']
  const rows = [headers.join(',')]
  for (const loc of locations) {
    rows.push([
      `"${(loc.store_name ?? '').replace(/"/g, '""')}"`,
      `"${(loc.address ?? '').replace(/"/g, '""')}"`,
      loc.risk_score != null ? String(loc.risk_score) : '',
      loc.lease_expiry ? `"${loc.lease_expiry}"` : '',
      loc.annual_rent != null ? String(loc.annual_rent) : '',
      loc.rent_per_sf != null ? loc.rent_per_sf.toFixed(2) : '',
      `"${(loc.top_risk ?? '').replace(/"/g, '""')}"`,
      loc.square_footage != null ? String(loc.square_footage) : '',
    ].join(','))
  }
  const csv = rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Provelo_Portfolio_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
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
