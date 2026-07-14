export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const token = req.headers.get('x-onboarding-token');

    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    // Forward to NestJS
    const upstream = await fetch(
      `${apiUrl}/assessment/${id}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-onboarding-token': token || '',
        },
        body: JSON.stringify(body),
      }
    );

    if (!upstream.ok) {
      return new Response('AI service error', { status: upstream.status });
    }

    // Return the stream directly
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(message, { status: 500 });
  }
}
