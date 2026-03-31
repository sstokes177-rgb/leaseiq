import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import type { ChunkMetadata } from '@/types'

export interface TextChunk {
  content: string
  metadata: ChunkMetadata
}

// Section headings commonly found in commercial leases
const SECTION_PATTERNS = [
  /^(ARTICLE|SECTION|EXHIBIT|ADDENDUM|SCHEDULE|AMENDMENT)\s+[\dIVXA-Z]+/i,
  /^\d+\.\s+[A-Z]/,
  /^[A-Z]{2,}[\s:]/,
]

function detectSectionHeading(line: string): string | null {
  const trimmed = line.trim()
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(trimmed) && trimmed.length < 120) {
      return trimmed
    }
  }
  return null
}

function splitIntoChunks(
  text: string,
  documentName: string,
  documentType: string,
  targetTokens = 600,
  overlapTokens = 80
): TextChunk[] {
  const targetChars = targetTokens * 4
  const overlapChars = overlapTokens * 4

  const lines = text.split('\n')
  const chunks: TextChunk[] = []

  let currentChunk = ''
  let currentHeading = ''
  let chunkIndex = 0
  let charCount = 0
  const avgCharsPerPage = 2500

  for (const line of lines) {
    const heading = detectSectionHeading(line)
    if (heading) {
      if (currentChunk.length > overlapChars) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            document_name: documentName,
            document_type: documentType,
            section_heading: currentHeading || undefined,
            page_number: Math.ceil(charCount / avgCharsPerPage),
            chunk_index: chunkIndex++,
          },
        })
        currentChunk = currentChunk.slice(-overlapChars)
      }
      currentHeading = heading
    }

    currentChunk += line + '\n'
    charCount += line.length + 1

    if (currentChunk.length >= targetChars) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          document_name: documentName,
          document_type: documentType,
          section_heading: currentHeading || undefined,
          page_number: Math.ceil(charCount / avgCharsPerPage),
          chunk_index: chunkIndex++,
        },
      })
      currentChunk = currentChunk.slice(-overlapChars)
    }
  }

  if (currentChunk.trim().length > 100) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        document_name: documentName,
        document_type: documentType,
        section_heading: currentHeading || undefined,
        page_number: Math.ceil(charCount / avgCharsPerPage),
        chunk_index: chunkIndex++,
      },
    })
  }

  return chunks
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer)
  const text = data.text
  if (!text || text.trim().length === 0) {
    throw new Error(
      'Could not extract text from this PDF. If it is a scanned document, please convert it to a searchable PDF first.'
    )
  }
  return text
}

async function extractWordText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  const text = result.value
  if (!text || text.trim().length === 0) {
    throw new Error('Could not extract text from this Word document.')
  }
  return text
}

/**
 * Determines MIME type from file extension when the browser-supplied type is unreliable.
 */
export function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  }
  return map[ext] ?? 'application/octet-stream'
}

export function isAcceptedFileType(mimeType: string, filename: string): boolean {
  const normalised = mimeType.toLowerCase()
  // Check MIME type
  if (
    normalised.includes('pdf') ||
    normalised === 'application/msword' ||
    normalised.includes('wordprocessingml') ||
    normalised.includes('openxmlformats')
  ) {
    return true
  }
  // Fall back to extension check (some browsers report wrong MIME for .doc)
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return ['pdf', 'doc', 'docx'].includes(ext)
}

export async function processDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  documentName: string,
  documentType: string
): Promise<TextChunk[]> {
  const normalised = mimeType.toLowerCase()
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  let rawText: string

  if (normalised.includes('pdf') || ext === 'pdf') {
    rawText = await extractPdfText(buffer)
  } else if (
    normalised === 'application/msword' ||
    normalised.includes('wordprocessingml') ||
    normalised.includes('openxmlformats') ||
    ext === 'doc' ||
    ext === 'docx'
  ) {
    rawText = await extractWordText(buffer)
  } else if (['jpg', 'jpeg', 'png', 'tiff', 'tif'].includes(ext)) {
    throw new Error(
      'Image upload support is coming soon. To upload a scanned lease, please convert the image to a PDF first using a free tool like Adobe Acrobat, Smallpdf, or your phone\'s scanner app.'
    )
  } else {
    throw new Error(
      `Unsupported file type "${ext}". Please upload a PDF (.pdf) or Word document (.doc, .docx).`
    )
  }

  return splitIntoChunks(rawText, documentName, documentType)
}

/** Backwards-compatible alias for existing callers */
export async function processPDF(
  buffer: Buffer,
  documentName: string,
  documentType: string
): Promise<TextChunk[]> {
  const rawText = await extractPdfText(buffer)
  return splitIntoChunks(rawText, documentName, documentType)
}
