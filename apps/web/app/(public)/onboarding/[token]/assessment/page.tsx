import { notFound } from 'next/navigation';
import { ChatInterface } from '@/components/assessment/ChatInterface';

async function getOnboardingUser(token: string) {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/invitations/validate/${token}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const result = await res.json();
  return result.success ? result.data : null;
}

export async function generateMetadata() {
  return {
    title: 'AI Skills Assessment | LearnPath',
    description: 'Conversational skills assessment to customize your learning journey.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AssessmentPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const user = await getOnboardingUser(token);
  if (!user) {
    notFound();
  }
  return <ChatInterface token={token} user={user} />;
}
