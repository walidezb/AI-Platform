import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@platform/shared';

export async function getCurrentUser() {
  try {
    const user = await currentUser();
    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }
  return user;
}

export async function getUserRole(): Promise<UserRole | null> {
  const { sessionClaims } = await auth();
  const metadata = (sessionClaims?.publicMetadata || {}) as Record<string, unknown>;
  return (metadata.role as UserRole) || null;
}
