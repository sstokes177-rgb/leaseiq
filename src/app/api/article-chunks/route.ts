import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const articleNumber = searchParams.get('article')
  const documentId = searchParams.get('document_id')
  const storeId = searchParams.get('store_id')

  if (!articleNumber) {
    return NextResponse.json({ error: 'article parameter required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Build query — search document_chunks for this article reference
  let query = admin
    .from('document_chunks')
    .select('id, content, metadata, document_id')
    .eq('tenant_id', user.id)

  if (documentId) {
    query = query.eq('document_id', documentId)
  } else if (storeId) {
    query = query.eq('store_id', storeId)
  }

  // Match chunks whose content mentions this article/section number
  const artNum = articleNumber.replace(/['"]/g, '')
  query = query.or(
    `content.ilike.%Article ${artNum}%,content.ilike.%ARTICLE ${artNum}%,content.ilike.%Section ${artNum}%,content.ilike.%SECTION ${artNum}%`
  )

  const { data: chunks, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sort by chunk_index so text appears in document order
  const sorted = (chunks ?? []).sort(
    (a, b) => ((a.metadata as { chunk_index?: number })?.chunk_index ?? 0) -
              ((b.metadata as { chunk_index?: number })?.chunk_index ?? 0)
  )

  // Concatenate and clean up the text
  const rawText = sorted.map(c => c.content).join('\n\n')
  const text = trimToArticleBoundary(rawText, artNum)

  return NextResponse.json({ text, chunk_count: sorted.length })
}

/**
 * Find the article heading in the concatenated text and start from there.
 * Also trims any partial word/sentence at the very beginning.
 */
function trimToArticleBoundary(text: string, articleNumber: string): string {
  if (!text) return text

  // Try to find the article heading — e.g. "ARTICLE 5" or "Article 5.1"
  const headingRe = new RegExp(
    `(ARTICLE|Article|SECTION|Section)\\s+${escapeRegex(articleNumber)}\\b`,
    'm'
  )
  const match = headingRe.exec(text)

  if (match && match.index !== undefined) {
    // Start from the article heading
    return text.slice(match.index).trim()
  }

  // Fallback: trim any partial leading word/sentence
  return trimLeadingFragment(text)
}

/** Remove a partial word or sentence fragment at the start of text. */
function trimLeadingFragment(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  // If starts with lowercase or mid-word fragment, skip to first complete sentence
  if (/^[a-z]/.test(trimmed)) {
    // Find the end of the partial sentence (first period/newline followed by uppercase)
    const sentenceEnd = trimmed.search(/[.!?]\s+[A-Z]/)
    if (sentenceEnd > 0 && sentenceEnd < 200) {
      return trimmed.slice(sentenceEnd + 2).trim()
    }
    // Or skip to first newline that starts a new section
    const newlineStart = trimmed.search(/\n\s*[A-Z]/)
    if (newlineStart > 0 && newlineStart < 200) {
      return trimmed.slice(newlineStart + 1).trim()
    }
  }
  return trimmed
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
