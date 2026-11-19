import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-helpers'

/** Serve images stored in the database (serverless deployments without Blob). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await db.upload.findUnique({ where: { id } })
  if (!row) return jsonError('عکس یافت نشد', 404)
  return new NextResponse(new Uint8Array(row.data), {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
