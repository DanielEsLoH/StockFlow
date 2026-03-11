import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { SeedContext, UserRef } from './types';
import { avatarUrl, daysAgo } from './helpers';

export async function seedUsers(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('👥 Creating Users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── Tienda Demo Users (10) ──
  const adminDemo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'admin@tienda-demo.com', password: hashedPassword,
      firstName: 'Juan', lastName: 'Pérez', phone: '+57 300 111 1111',
      avatar: avatarUrl('Juan', 'Pérez'),
      role: 'ADMIN', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const managerDemo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'gerente@tienda-demo.com', password: hashedPassword,
      firstName: 'Andrea', lastName: 'López', phone: '+57 300 999 8888',
      avatar: avatarUrl('Andrea', 'López'),
      role: 'MANAGER', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  const employeeDemo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'empleado@tienda-demo.com', password: hashedPassword,
      firstName: 'María', lastName: 'González', phone: '+57 300 222 2222',
      avatar: avatarUrl('María', 'González'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const employee2Demo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'vendedor@tienda-demo.com', password: hashedPassword,
      firstName: 'Luis', lastName: 'Ramírez', phone: '+57 300 333 3333',
      avatar: avatarUrl('Luis', 'Ramírez'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(2),
    },
  });

  const managerSouthDemo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'gerente.sur@tienda-demo.com', password: hashedPassword,
      firstName: 'Camilo', lastName: 'Restrepo', phone: '+57 300 444 4444',
      avatar: avatarUrl('Camilo', 'Restrepo'),
      role: 'MANAGER', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(2),
    },
  });

  const employeePosDemo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'cajero@tienda-demo.com', password: hashedPassword,
      firstName: 'Sofía', lastName: 'Herrera', phone: '+57 300 555 5555',
      avatar: avatarUrl('Sofía', 'Herrera'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const employeeSouthDemo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'bodeguero@tienda-demo.com', password: hashedPassword,
      firstName: 'Ricardo', lastName: 'Salazar', phone: '+57 300 666 6666',
      avatar: avatarUrl('Ricardo', 'Salazar'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  // Edge-case users (suspended, pending, inactive)
  const suspendedUserDemo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'suspendido@tienda-demo.com', password: hashedPassword,
      firstName: 'Fernando', lastName: 'Arias', phone: '+57 300 777 7777',
      avatar: avatarUrl('Fernando', 'Arias'),
      role: 'EMPLOYEE', status: 'SUSPENDED', emailVerified: true, lastLoginAt: daysAgo(30),
    },
  });

  await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'pendiente@tienda-demo.com', password: hashedPassword,
      firstName: 'Carolina', lastName: 'Muñoz', phone: '+57 300 888 8888',
      role: 'EMPLOYEE', status: 'PENDING', emailVerified: false,
    },
  });

  await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'inactivo@tienda-demo.com', password: hashedPassword,
      firstName: 'Miguel', lastName: 'Ospina', phone: '+57 300 999 0000',
      role: 'MANAGER', status: 'INACTIVE', emailVerified: true, lastLoginAt: daysAgo(60),
    },
  });

  // ── Distribuidora Nacional Users (6) ──
  const dnAdmin = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id, email: 'admin@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Roberto', lastName: 'Camacho', phone: '+57 1 555 0001',
      avatar: avatarUrl('Roberto', 'Camacho'),
      role: 'ADMIN', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  const dnManager = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id, email: 'gerente@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Patricia', lastName: 'Mendoza', phone: '+57 1 555 0002',
      avatar: avatarUrl('Patricia', 'Mendoza'),
      role: 'MANAGER', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const dnEmployee1 = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id, email: 'empleado@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Diana', lastName: 'Acosta', phone: '+57 1 555 0003',
      avatar: avatarUrl('Diana', 'Acosta'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const dnEmployee2 = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id, email: 'bodeguero@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Héctor', lastName: 'Vargas', phone: '+57 1 555 0004',
      avatar: avatarUrl('Héctor', 'Vargas'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(2),
    },
  });

  // OAuth users for enum coverage
  const dnGoogleUser = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id, email: 'google.user@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Marcela', lastName: 'Ríos', phone: '+57 1 555 0005',
      avatar: avatarUrl('Marcela', 'Ríos'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(3),
      authProvider: 'GOOGLE', googleId: 'google-oauth-id-12345',
    },
  });

  const dnGithubUser = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id, email: 'github.user@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Esteban', lastName: 'Cruz', phone: '+57 1 555 0006',
      role: 'EMPLOYEE', status: 'SUSPENDED', emailVerified: true, lastLoginAt: daysAgo(15),
      authProvider: 'GITHUB', githubId: 'github-oauth-id-67890',
    },
  });

  // ── Nuevo Negocio Users (1) ──
  const nnAdmin = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.nuevo.id, email: 'admin@nuevonegocio.com', password: hashedPassword,
      firstName: 'Alejandro', lastName: 'Mora', phone: '+57 311 555 4444',
      avatar: avatarUrl('Alejandro', 'Mora'),
      role: 'ADMIN', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  // ── Papelería Central Users (4) ──
  const pcAdmin = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.papeleria.id, email: 'admin@papeleriacentral.com', password: hashedPassword,
      firstName: 'Gloria', lastName: 'Espinosa', phone: '+57 4 987 6543',
      avatar: avatarUrl('Gloria', 'Espinosa'),
      role: 'ADMIN', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const pcManager = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.papeleria.id, email: 'gerente@papeleriacentral.com', password: hashedPassword,
      firstName: 'Fabián', lastName: 'Ortiz', phone: '+57 4 987 0001',
      avatar: avatarUrl('Fabián', 'Ortiz'),
      role: 'MANAGER', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  const pcEmployee1 = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.papeleria.id, email: 'vendedor@papeleriacentral.com', password: hashedPassword,
      firstName: 'Natalia', lastName: 'Cardona', phone: '+57 4 987 0002',
      avatar: avatarUrl('Natalia', 'Cardona'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const pcEmployee2 = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.papeleria.id, email: 'cajero@papeleriacentral.com', password: hashedPassword,
      firstName: 'Tomás', lastName: 'Duque', phone: '+57 4 987 0003',
      avatar: avatarUrl('Tomás', 'Duque'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  // ── Contadores (1 per tenant with plan) ──
  const contadorDemo = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.demo.id, email: 'contador@tienda-demo.com', password: hashedPassword,
      firstName: 'Isabel', lastName: 'Quintero', phone: '+57 300 111 9999',
      avatar: avatarUrl('Isabel', 'Quintero'),
      role: 'CONTADOR', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(3),
    },
  });

  const contadorDN = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id, email: 'contador@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Hernando', lastName: 'Parra', phone: '+57 1 555 0007',
      avatar: avatarUrl('Hernando', 'Parra'),
      role: 'CONTADOR', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(5),
    },
  });

  const contadorPC = await prisma.user.create({
    data: {
      tenantId: ctx.tenants.papeleria.id, email: 'contador@papeleriacentral.com', password: hashedPassword,
      firstName: 'Adriana', lastName: 'Serna', phone: '+57 4 987 0004',
      avatar: avatarUrl('Adriana', 'Serna'),
      role: 'CONTADOR', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(2),
    },
  });

  // ── Helper to build UserRef ──
  function ref(u: { id: string; email: string; firstName: string; lastName: string }, role: string): UserRef {
    return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role };
  }

  // ── Populate context ──
  ctx.users = {
    demo: {
      admin: ref(adminDemo, 'ADMIN'),
      managers: [ref(managerDemo, 'MANAGER'), ref(managerSouthDemo, 'MANAGER')],
      employees: [
        ref(employeeDemo, 'EMPLOYEE'),
        ref(employee2Demo, 'EMPLOYEE'),
        ref(employeePosDemo, 'EMPLOYEE'),
        ref(employeeSouthDemo, 'EMPLOYEE'),
      ],
      contador: ref(contadorDemo, 'CONTADOR'),
      allActive: [
        ref(adminDemo, 'ADMIN'),
        ref(managerDemo, 'MANAGER'),
        ref(employeeDemo, 'EMPLOYEE'),
        ref(employee2Demo, 'EMPLOYEE'),
        ref(managerSouthDemo, 'MANAGER'),
        ref(employeePosDemo, 'EMPLOYEE'),
        ref(employeeSouthDemo, 'EMPLOYEE'),
      ],
    },
    distribuidora: {
      admin: ref(dnAdmin, 'ADMIN'),
      manager: ref(dnManager, 'MANAGER'),
      employees: [
        ref(dnEmployee1, 'EMPLOYEE'),
        ref(dnEmployee2, 'EMPLOYEE'),
        ref(dnGoogleUser, 'EMPLOYEE'),
        ref(dnGithubUser, 'EMPLOYEE'),
      ],
      contador: ref(contadorDN, 'CONTADOR'),
    },
    nuevo: {
      admin: ref(nnAdmin, 'ADMIN'),
    },
    papeleria: {
      admin: ref(pcAdmin, 'ADMIN'),
      manager: ref(pcManager, 'MANAGER'),
      employees: [ref(pcEmployee1, 'EMPLOYEE'), ref(pcEmployee2, 'EMPLOYEE')],
      contador: ref(contadorPC, 'CONTADOR'),
    },
  };

  // ── UserPermissionOverrides ────────────────────────────────────
  // Grant/revoke specific granular permissions for select users

  await prisma.userPermissionOverride.createMany({
    data: [
      // Demo: employee gets POS refund permission (normally MANAGER only)
      {
        userId: employeeDemo.id,
        tenantId: ctx.tenants.demo.id,
        permission: 'pos:refund',
        granted: true,
        grantedBy: adminDemo.id,
        reason: 'Empleado senior con 3 años de experiencia — autorizado para devoluciones en POS',
      },
      // Demo: another employee gets inventory adjustment
      {
        userId: employee2Demo.id,
        tenantId: ctx.tenants.demo.id,
        permission: 'inventory:adjust',
        granted: true,
        grantedBy: adminDemo.id,
        reason: 'Responsable de bodega — necesita ajustar stock manualmente',
      },
      // Demo: revoke report export from suspended user
      {
        userId: suspendedUserDemo.id,
        tenantId: ctx.tenants.demo.id,
        permission: 'reports:export',
        granted: false,
        grantedBy: adminDemo.id,
        reason: 'Permiso revocado por política de seguridad tras incidente',
      },
      // Distribuidora: employee gets purchase order creation
      {
        userId: dnEmployee1.id,
        tenantId: ctx.tenants.distribuidora.id,
        permission: 'purchases:create',
        granted: true,
        grantedBy: dnAdmin.id,
        reason: 'Autorizado para crear órdenes de compra menores a $5M',
      },
      // Distribuidora: employee gets customer management
      {
        userId: dnEmployee2.id,
        tenantId: ctx.tenants.distribuidora.id,
        permission: 'customers:edit',
        granted: true,
        grantedBy: dnAdmin.id,
        reason: 'Encargado de cartera — necesita actualizar datos de clientes',
      },
      // Papelería: employee gets invoice creation
      {
        userId: pcEmployee1.id,
        tenantId: ctx.tenants.papeleria.id,
        permission: 'invoices:create',
        granted: true,
        grantedBy: pcAdmin.id,
        reason: 'Cajero principal — puede crear facturas directamente',
      },
    ],
  });

  console.log('   ✅ 24 Users created (11 Demo + 7 Distribuidora + 1 Nuevo Negocio + 5 Papelería)');
  console.log('   ✅ 6 Permission overrides created');
}
