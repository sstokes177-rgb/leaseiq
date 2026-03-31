import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages, type UIMessage, type TextUIPart } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { buildRAGContext } from '@/lib/ragChain'

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as TextUIPart).text)
    .join('')
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
  const { systemPrompt, citations } = await buildRAGContext(userText, user.id, storeId ?? null)
  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 1024,
    maxRetries: 3,
    onFinish: async ({ text }) => {
      if (conversationId) {
        const adminSupabase = createAdminSupabaseClient()
        await adminSupabase.from('conversations').upsert(
          { id: conversationId, tenant_id: user.id, store_id: storeId ?? null },
          { onConflict: 'id', ignoreDuplicates: true }
        )
        await adminSupabase.from('messages').insert([
          { conversation_id: conversationId, role: 'user', content: userText },
          { conversation_id: conversationId, role: 'assistant', content: text, citations },
        ])
      }
    },
  })

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => part.type === 'finish' ? { citations } : undefined,
  })
}
