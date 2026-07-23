import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── 1. Platform Admin ──
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@learnai.com' },
    update: {},
    create: {
      email: 'admin@learnai.com',
      fullName: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
      clerkId: 'seed_platform_admin',
      preferredLanguage: 'EN',
      organizationId: 'seed_platform_org', // fallback placeholder
    },
  }).catch(async () => {
    // If org doesn't exist, create Platform Org first
    const platformOrg = await prisma.organization.upsert({
      where: { slug: 'platform-admin-org' },
      update: {},
      create: {
        name: 'Platform Admin Org',
        slug: 'platform-admin-org',
        status: 'ACTIVE',
        planTier: 'enterprise',
      },
    });
    return prisma.user.upsert({
      where: { email: 'admin@learnai.com' },
      update: {},
      create: {
        email: 'admin@learnai.com',
        fullName: 'Platform Admin',
        role: 'PLATFORM_ADMIN',
        clerkId: 'seed_platform_admin',
        preferredLanguage: 'EN',
        organizationId: platformOrg.id,
      },
    });
  });
  console.log(`✅ Platform Admin: ${platformAdmin.email}`);

  // ── 2. Demo Organization: Acme Corp ──
  const acme = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      status: 'ACTIVE',
      planTier: 'growth',
      aiTokensBudget: 2_000_000,
      currentPeriodStart: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ),
      currentPeriodEnd: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ),
    },
  });
  console.log(`✅ Organization: ${acme.name} (${acme.id})`);

  // ── 3. Demo Manager ──
  const manager = await prisma.user.upsert({
    where: { email: 'manager@acme-corp.com' },
    update: {},
    create: {
      email: 'manager@acme-corp.com',
      fullName: 'Sarah Mitchell',
      role: 'MANAGER',
      jobTitle: 'Engineering Manager',
      organizationId: acme.id,
      clerkId: 'seed_manager_acme',
    },
  });
  console.log(`✅ Manager: ${manager.fullName}`);

  // ── 4. Demo ORG_ADMIN ──
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'orgadmin@acme-corp.com' },
    update: {},
    create: {
      email: 'orgadmin@acme-corp.com',
      fullName: 'James Crawford (Org Admin)',
      role: 'ORG_ADMIN',
      organizationId: acme.id,
      clerkId: 'seed_orgadmin_acme', // placeholder
      preferredLanguage: 'EN',
    },
  });
  console.log(`✅ Org Admin: ${orgAdmin.fullName}`);
  console.log(`   → To enable login: create a Clerk user`);
  console.log(`     with email: orgadmin@acme-corp.com`);
  console.log(`     then update clerkId in DB to match`);

  // ── 5. Demo Employees (3) ──
  const employees = [
    {
      email: 'alice@acme-corp.com',
      fullName: 'Alice Chen',
      department: 'Engineering',
      jobTitle: 'Senior Software Engineer',
      skills: ['TypeScript', 'React', 'Node.js'],
      gaps: ['System Design', 'Performance'],
      completion: 72,
      streak: 8,
    },
    {
      email: 'bob@acme-corp.com',
      fullName: 'Bob Karim',
      department: 'Product',
      jobTitle: 'Product Manager',
      skills: ['Product Strategy', 'Agile'],
      gaps: ['Data Analysis', 'SQL'],
      completion: 45,
      streak: 3,
    },
    {
      email: 'sara@acme-corp.com',
      fullName: 'Sara Al-Rashid',
      department: 'Engineering',
      jobTitle: 'Junior Developer',
      skills: ['JavaScript', 'HTML/CSS'],
      gaps: ['TypeScript', 'Testing', 'React'],
      completion: 28,
      streak: 12,
    },
  ];

  for (const emp of employees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        fullName: emp.fullName,
        jobTitle: emp.jobTitle,
        role: 'LEARNER',
        organizationId: acme.id,
        clerkId: `seed_${emp.email.split('@')[0]}`,
      },
    });

    // Create completed assessment record for employee
    await prisma.assessment.create({
      data: {
        userId: user.id,
        organizationId: acme.id,
        status: 'COMPLETED',
        identifiedRole: emp.jobTitle,
        experienceLevel: emp.completion > 60 ? 'INTERMEDIATE' : 'BEGINNER',
        strongAreas: emp.skills,
        weakAreas: emp.gaps,
        completedAt: new Date(),
        skillProfile: {
          strengths: emp.skills,
          gaps: emp.gaps,
          level: emp.completion > 60 ? 'intermediate' : 'beginner',
        },
      },
    });

    // Create a learning path for each employee
    const path = await prisma.learningPath.create({
      data: {
        organizationId: acme.id,
        userId: user.id,
        title: `${emp.skills[0]} Mastery Path`,
        description: `Comprehensive learning path for mastering ${emp.skills[0]}`,
        domain: emp.department,
        status: 'ACTIVE',
        estimatedHours: 40,
        milestones: {
          create: [
            {
              sequenceOrder: 1,
              title: 'Foundations',
              description: 'Core fundamental concepts and syntax',
              learningObjectives: [`Master basics of ${emp.skills[0]}`],
              estimatedHours: 10,
              modules: {
                create: [
                  {
                    sequenceOrder: 1,
                    title: 'Core Concepts',
                    description: 'Deep dive into fundamental building blocks',
                    moduleType: 'READING',
                    estimatedMinutes: 45,
                    resources: {
                      create: [
                        {
                          title: `Introduction to ${emp.skills[0]}`,
                          resourceType: 'ARTICLE',
                          url: 'https://example.com/intro',
                          sourcePlatform: 'Web Document',
                          description: 'Official introduction article',
                          sequenceOrder: 1,
                        },
                        {
                          title: `${emp.skills[0]} Best Practices`,
                          resourceType: 'VIDEO',
                          url: 'https://youtube.com/watch?v=example',
                          sourcePlatform: 'YouTube',
                          description: 'Best practices video tutorial',
                          sequenceOrder: 2,
                          durationMinutes: 20,
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              sequenceOrder: 2,
              title: 'Intermediate Concepts',
              description: 'Advanced patterns and scalable architecture',
              learningObjectives: ['Apply design patterns in real projects'],
              estimatedHours: 15,
              modules: {
                create: [
                  {
                    sequenceOrder: 1,
                    title: 'Advanced Patterns',
                    description: 'Modern development patterns and practices',
                    moduleType: 'EXERCISE',
                    estimatedMinutes: 60,
                  },
                ],
              },
            },
          ],
        },
      },
    });

    // Create UserProgress record
    await prisma.userProgress.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        learningPathId: path.id,
        overallCompletionPct: emp.completion,
        streakDays: emp.streak,
        timeSpentMinutes: Math.round(emp.completion * 4.5),
        lastActivityAt: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
        ),
        status: 'IN_PROGRESS',
      },
    });

    // Seed some AI usage
    await prisma.aiUsageLog.createMany({
      data: Array(5)
        .fill(null)
        .map(() => ({
          organizationId: acme.id,
          userId: user.id,
          feature: 'ASSESSMENT',
          modelUsed: 'gpt-4o',
          tokensUsed: Math.floor(Math.random() * 5000) + 1000,
          costUsd: parseFloat((Math.random() * 0.05).toFixed(4)),
          createdAt: new Date(
            Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
          ),
        })),
    });

    console.log(
      `✅ Employee: ${emp.fullName} (${Math.round(emp.completion)}% complete)`,
    );
  }

  // ── 6. Alert Settings for Acme ──
  await prisma.alertSettings.upsert({
    where: { organizationId: acme.id },
    update: {},
    create: {
      organizationId: acme.id,
      stalledAfterDays: 7,
      enableManagerAlerts: true,
      enableLearnerNudges: true,
    },
  });

  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────');
  console.log('Demo accounts created:');
  console.log('  Platform Admin:  admin@learnai.com');
  console.log('  Org Admin:       orgadmin@acme-corp.com');
  console.log('  Manager:         manager@acme-corp.com');
  console.log('  Learner 1:       alice@acme-corp.com');
  console.log('  Learner 2:       bob@acme-corp.com');
  console.log('  Learner 3:       sara@acme-corp.com');
  console.log('─────────────────────────────────\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
