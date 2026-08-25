import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const conversations = await db.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
    },
    take: 50,
  })
  return Response.json(conversations)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'ID required' }, { status: 400 })
  await db.message.deleteMany({ where: { conversationId: id } })
  await db.conversation.delete({ where: { id } })
  return Response.json({ success: true })
}

export async function POST(req: NextRequest) {
  const conv = await db.conversation.create({ data: { title: 'New Chat' } })
  return Response.json(conv)
}