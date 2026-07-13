'use server';

export async function createOrganization(data: {
  name: string;
  slug: string;
  industry: string;
  clerkId: string;
  email: string;
  fullName: string;
}) {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/orgs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create organization');
  }
  return res.json();
}
