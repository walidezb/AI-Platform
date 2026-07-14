import { redirect } from 'next/navigation';
import { AssessmentCompleteScreen } from '@/components/assessment/AssessmentCompleteScreen';

async function fetchProfileByToken(token: string) {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/assessment/profile-by-token/${token}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function AssessmentCompletePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  const data = await fetchProfileByToken(token);

  if (!data || !data.hasAssessment || !data.assessment) {
    // If no assessment → redirect back to assessment page
    redirect(`/onboarding/${token}/assessment`);
  }

  return (
    <AssessmentCompleteScreen
      token={token}
      employeeName={data.employeeName}
      orgName={data.orgName}
      assessment={data.assessment}
    />
  );
}
