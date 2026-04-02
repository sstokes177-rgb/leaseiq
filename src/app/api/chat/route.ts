import { NextRequest } from 'next/server'
import { streamText, generateText, convertToModelMessages, type UIMessage, type TextUIPart } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { buildRAGContext } from '@/lib/ragChain'

async function generateConversationTitle(question: string, answer: string): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 20,
      messages: [{
        role: 'user',
        content: `Write a 4-6 word title for this lease Q&A conversation. Return ONLY the title, no punctuation.\n\nQuestion: ${question.slice(0, 200)}\nAnswer: ${answer.slice(0, 300)}`,
      }],
    })
    return text.trim().slice(0, 80)
  } catch {
    return null
  }
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as TextUIPart).text)
    .join('')
}

function isOverloadedError(err: unknown): boolean {
  const msg = String(err).toLowerCase()
  return msg.includes('overload') || msg.includes('529')
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const {
    messages,
    id: conversationId,
    store_id: storeId,
  }: { messages: UIMessage[]; id?: string; store_id?: string | null } = await request.json()

  if (!messages || messages.length === 0) {
    return new Response('No messages provided', { status: 400 })
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUserMessage) {
    return new Response('No user message found', { status: 400 })
  }

  const userText = getMessageText(lastUserMessage)

  console.log(`[Chat] Question received: "${userText.slice(0, 100)}"`)
  console.log(`[Chat] Store ID: ${storeId ?? 'null'} | User: ${user.id}`)

  // Fetch user's language preference
  let languagePreference = 'en'
  try {
    const adminSupabase = createAdminSupabaseClient()
    const { data: profile } = await adminSupabase
      .from('tenant_profiles')
      .select('language_preference')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.language_preference) {
      languagePreference = profile.language_preference
    }
  } catch {
    // Default to English
  }

  let systemPrompt: string
  let citations: import('@/types').Citation[]
  try {
    const ragResult = await buildRAGContext(userText, user.id, storeId ?? null)
    systemPrompt = ragResult.systemPrompt
    citations = ragResult.citations
  } catch (err) {
    console.error('[Chat] RAG context build failed:', err)
    return new Response('Search failed. Please try again.', { status: 500 })
  }

  // Append Spanish instruction if user prefers Spanish
  if (languagePreference === 'es') {
    systemPrompt += '\n\nIMPORTANT: The user prefers Spanish. You MUST respond entirely in Spanish. Use clear, professional Spanish. Translate all lease terminology appropriately (e.g., "tenant" = "arrendatario", "landlord" = "arrendador", "lease" = "contrato de arrendamiento").'
  }

  const modelMessages = await convertToModelMessages(messages)

  // Try primary model (sonnet), fall back to haiku if overloaded
  const PRIMARY_MODEL = 'claude-sonnet-4-6'
  const FALLBACK_MODEL = 'claude-haiku-4-5-20251001'

  let modelId = PRIMARY_MODEL
  let result

  console.log(`[Chat] Sending ${citations.length} chunks to Claude with model: ${modelId}`)

  try {
    result = streamText({
      model: anthropic(modelId),
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 1024,
      maxRetries: 6,
      onFinish: async ({ text, finishReason }) => {
        if (finishReason === 'error') {
          console.error(`[Chat] Stream finished with error`)
        } else {
          console.log(`[Chat] Response received successfully — model: ${modelId}, length: ${text.length} chars`)
        }
        if (conversationId && text) {
          try {
            const adminSupabase = createAdminSupabaseClient()
            // Upsert conversation (create if new, update timestamp if existing)
            await adminSupabase
              .from('conversations')
              .upsert(
                { id: conversationId, tenant_id: user.id, store_id: storeId ?? null, updated_at: new Date().toISOString() },
                { onConflict: 'id' }
              )
            // Always save this message pair
            const { error: msgErr } = await adminSupabase.from('messages').insert([
              { conversation_id: conversationId, role: 'user', content: userText },
              { conversation_id: conversationId, role: 'assistant', content: text, citations },
            ])
            if (msgErr) console.error('[Chat] Failed to save messages:', msgErr.message)
            // Auto-title: generate if conversation has no title yet (fire-and-forget)
            generateConversationTitle(userText, text).then(async (title) => {
              if (!title) return
              const { data: existing } = await adminSupabase
                .from('conversations')
                .select('title')
                .eq('id', conversationId)
                .maybeSingle()
              if (existing && !existing.title) {
                await adminSupabase
                  .from('conversations')
                  .update({ title })
                  .eq('id', conversationId)
              }
            }).catch(() => {})
          } catch (err) {
            console.error('[Chat] Failed to save conversation:', err)
          }
        }
      },
    })
  } catch (err) {
    // streamText exhausted all retries — try haiku fallback
    if (isOverloadedError(err)) {
      modelId = FALLBACK_MODEL
      console.log(`[Chat] ${PRIMARY_MODEL} overloaded after all retries — falling back to ${FALLBACK_MODEL}`)
      try {
        result = streamText({
          model: anthropic(modelId),
          system: systemPrompt,
          messages: modelMessages,
          maxOutputTokens: 1024,
          maxRetries: 3,
          onFinish: async ({ text }) => {
            console.log(`[Chat] Response received successfully — model: ${modelId} (fallback), length: ${text.length} chars`)
            if (conversationId && text) {
              try {
                const adminSupabase = createAdminSupabaseClient()
                await adminSupabase
                  .from('conversations')
                  .upsert(
                    { id: conversationId, tenant_id: user.id, store_id: storeId ?? null, updated_at: new Date().toISOString() },
                    { onConflict: 'id' }
                  )
                await adminSupabase.from('messages').insert([
                  { conversation_id: conversationId, role: 'user', content: userText },
                  { conversation_id: conversationId, role: 'assistant', content: text, citations },
                ])
                generateConversationTitle(userText, text).then(async (title) => {
                  if (!title) return
                  const { data: existing } = await adminSupabase
                    .from('conversations').select('title').eq('id', conversationId).maybeSingle()
                  if (existing && !existing.title) {
                    await adminSupabase.from('conversations').update({ title }).eq('id', conversationId)
                  }
                }).catch(() => {})
              } catch (saveErr) {
                console.error('[Chat] Failed to save conversation:', saveErr)
              }
            }
          },
        })
      } catch (haikusErr) {
        console.error('[Chat] Both models overloaded:', haikusErr)
        return new Response(
          'Our AI is experiencing high demand. Please try again in a moment.',
          { status: 503 }
        )
      }
    } else {
      console.error('[Chat] Unexpected streamText error:', err)
      return new Response('An unexpected error occurred. Please try again.', { status: 500 })
    }
  }

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => part.type === 'finish' ? { citations } : undefined,
  })
}
