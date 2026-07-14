import { redirect } from 'next/navigation';
import { WaitingScreen } from '@/components/onboarding/WaitingScreen';

async function validateOnboardingToken(token: string) {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/invitations/validate/${token}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) return { valid: false };
  const result = await res.json();
  return result.success ? {
    valid: true,
    userId: result.data.id,
    employeeName: result.data.fullName,
    orgName: result.data.organization?.name || 'Company',
  } : { valid: false };
}

export default async function PathReadyPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  // Validate token
  const validation = await validateOnboardingToken(token);

  if (!validation.valid || !validation.userId) {
    redirect(`/onboarding/${token}`);
  }

  return (
    <WaitingScreen
      token={token}
      userId={validation.userId}
      employeeName={validation.employeeName || ''}
      orgName={validation.orgName || ''}
    />
  );
}
