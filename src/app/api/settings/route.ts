import { NextRequest } from 'next/server'
import { getAllSettings, setSetting, getProviderStatuses } from '@/lib/ai-router'

export async function GET() {
  const settings = await getAllSettings()
  const providers = await getProviderStatuses()
  return Response.json({ settings, providers })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { key, value } = body
  if (!key) return Response.json({ error: 'Key is required' }, { status: 400 })
  await setSetting(key, value)
  return Response.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  if (!Array.isArray(body)) return Response.json({ error: 'Expected array' }, { status: 400 })
  for (const { key, value } of body) {
    if (key) await setSetting(key, value)
  }
  return Response.json({ success: true })
}