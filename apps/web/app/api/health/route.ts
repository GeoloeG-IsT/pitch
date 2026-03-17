import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const timestamp = new Date().toISOString();

  try {
    const res = await fetch(`${backendUrl}/api/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();

    return NextResponse.json({
      status: 'healthy',
      frontend: 'ok',
      backend: data.status === 'ok' ? 'ok' : 'degraded',
      database: data.database || 'unreachable',
      timestamp,
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        frontend: 'ok',
        backend: 'unreachable',
        database: 'unreachable',
        timestamp,
      },
      { status: 503 }
    );
  }
}
