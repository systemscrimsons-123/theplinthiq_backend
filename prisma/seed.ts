import { PrismaClient, UserRole, AccountStatus, VerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@plinth.art').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456!';
  const adminPhone = process.env.ADMIN_PHONE || '+918454949643';

  console.log(`\n🌱 [THE PLINTH IQ SEED] Initializing admin user...`);
  console.log(`   Target Email: ${adminEmail}`);

  // Hash password using 12 salt rounds (standard for THE PLINTH IQ auth)
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email1: adminEmail },
    update: {
      role: UserRole.admin,
      status: AccountStatus.active,
      verificationStatus: VerificationStatus.verified,
      emailVerifiedAt: new Date(),
      onboardingCompleted: true,
      passwordHash,
      phone1: adminPhone,
    },
    create: {
      email1: adminEmail,
      passwordHash,
      phone1: adminPhone,
      role: UserRole.admin,
      status: AccountStatus.active,
      verificationStatus: VerificationStatus.verified,
      emailVerifiedAt: new Date(),
      onboardingCompleted: true,
    },
  });

  console.log(`✅ [THE PLINTH IQ SEED] Admin user seeded successfully!`);
  console.log(`   User ID:     ${admin.id}`);
  console.log(`   Email:       ${admin.email1}`);
  console.log(`   Phone:       ${admin.phone1}`);
  console.log(`   Role:        ${admin.role}`);
  console.log(`   Status:      ${admin.status}`);
  console.log(`   Verified:    ${admin.verificationStatus}`);
  console.log(`   Login URL:   /admin/login\n`);
}

main()
  .catch((e) => {
    console.error('❌ [THE PLINTH IQ SEED] Error seeding admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
