import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean up any existing records to keep the seed idempotent
  await prisma.roleDefinition.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.organization.deleteMany({});

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      planTier: 'STARTER',
    },
  });

  // 2. Define default departments and roles
  const departmentsData = [
    {
      name: 'Engineering',
      roles: [
        { title: 'Frontend Developer', areas: ['React', 'TypeScript', 'CSS', 'Testing'] },
        { title: 'Backend Developer', areas: ['Node.js', 'Python', 'SQL', 'AWS'] },
        { title: 'DevOps Engineer', areas: ['Docker', 'Kubernetes', 'CI/CD', 'Linux'] },
      ]
    },
    {
      name: 'Product',
      roles: [
        { title: 'Product Manager', areas: ['Product Strategy', 'Agile', 'Analytics', 'Roadmapping'] },
        { title: 'UX Designer', areas: ['Figma', 'User Research', 'Prototyping', 'Accessibility'] },
      ]
    },
    {
      name: 'Sales',
      roles: [
        { title: 'Account Executive', areas: ['CRM', 'Negotiation', 'Prospecting', 'Salesforce'] },
        { title: 'Sales Development Rep', areas: ['Cold Outreach', 'LinkedIn', 'Email Sequences'] },
      ]
    },
  ];

  for (const deptData of departmentsData) {
    const dept = await prisma.department.create({
      data: {
        name: deptData.name,
        organizationId: org.id,
      },
    });

    for (const roleData of deptData.roles) {
      await prisma.roleDefinition.create({
        data: {
          title: roleData.title,
          learningFocusAreas: roleData.areas,
          organizationId: org.id,
          departmentId: dept.id,
        },
      });
    }
  }

  console.log('✅ Database seeded successfully with default departments and roles');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
