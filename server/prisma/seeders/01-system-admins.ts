import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { SeedContext } from './types';
import { daysAgo } from './helpers';

export async function seedSystemAdmins(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('👤 Creating System Admins...');

  const systemAdminPassword = process.env.SYSTEM_ADMIN_PASSWORD || 'Picema82*';
  const hashedSystemAdminPassword = await bcrypt.hash(systemAdminPassword, 12);

  const superAdmin = await prisma.systemAdmin.create({
    data: {
      email: process.env.SYSTEM_ADMIN_EMAIL || 'daniel.esloh@gmail.com',
      password: hashedSystemAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(0),
    },
  });
  console.log(`   → Super Admin: ${superAdmin.email}`);

  const supportAdmin = await prisma.systemAdmin.create({
    data: {
      email: 'soporte@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Carlos',
      lastName: 'Soporte',
      role: 'SUPPORT',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(1),
    },
  });
  console.log(`   → Support Admin: ${supportAdmin.email}`);

  const billingAdmin = await prisma.systemAdmin.create({
    data: {
      email: 'facturacion@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Laura',
      lastName: 'Facturación',
      role: 'BILLING',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(3),
    },
  });
  console.log(`   → Billing Admin: ${billingAdmin.email}`);

  console.log('   ✅ 3 System Admins created');
}
