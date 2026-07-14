import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { onboardingToken } = body;

    if (!onboardingToken) {
      return NextResponse.json({ error: 'Missing onboarding token' }, { status: 400 });
    }

    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const upstream = await fetch(`${apiUrl}/assessment/start-by-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ onboardingToken }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json({ error: errText || 'Failed to start assessment' }, { status: upstream.status });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
