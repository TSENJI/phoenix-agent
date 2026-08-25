import { NextRequest } from 'next/server'
import { streamChat, getProviderStatuses } from '@/lib/ai-router'
import { db } from '@/lib/db'
import { ChatMessage } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, conversationId, model } = body

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400 })
    }

    let convId = conversationId
    if (!convId) {
      const conv = await db.conversation.create({
        data: { title: message.slice(0, 50), model: model || 'auto' },
      })
      convId = conv.id
    }

    await db.message.create({
      data: { role: 'user', content: message, conversationId: convId },
    })

    const msgCount = await db.message.count({ where: { conversationId: convId } })
    if (msgCount <= 1) {
      await db.conversation.update({ where: { id: convId }, data: { title: message.slice(0, 50) } })
    }

    const history = await db.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
    })

    const chatMessages: ChatMessage[] = history.map(m => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    }))

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        let usedProvider = ''

        try {
          for await (const chunk of streamChat(chatMessages, model)) {
            if (chunk.type === 'text') fullResponse += chunk.content
            if (chunk.type === 'status') usedProvider = chunk.content
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          }

          if (fullResponse) {
            await db.message.create({
              data: { role: 'assistant', content: fullResponse, model: usedProvider, conversationId: convId },
            })
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: convId })}\n\n`))
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: err instanceof Error ? err.message : String(err) })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 })
  }
}

export async function GET() {
  const statuses = await getProviderStatuses()
  return Response.json(statuses)
}