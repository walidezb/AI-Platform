import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await props.params;
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const res = await fetch(
      `${apiUrl}/assessment/${userId}/path-status?token=${token}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || 'Failed to fetch status' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
