import { PrismaClient } from '@prisma/client';
import { SeedContext, CustomerRecord } from './types';

export async function seedCustomers(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('👤 Seeding customers...');

  // ── Demo Tenant Customers (25) ───────────────────────────────────
  const demoTenantId = ctx.tenants.demo.id;
  console.log('  → Demo tenant customers...');

  const demoCustomersData = [
    { name: 'Carlos Alberto Gómez', email: 'carlos.gomez@email.com', phone: '+57 300 100 0001', documentType: 'CC' as const, documentNumber: '1020304050', address: 'Calle 10 #43-12, El Poblado', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Laura Valentina Ríos', email: 'laura.rios@email.com', phone: '+57 300 100 0002', documentType: 'CC' as const, documentNumber: '1030405060', address: 'Carrera 70 #44-21', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Andrés Felipe Castillo', email: 'andres.castillo@email.com', phone: '+57 300 100 0003', documentType: 'CC' as const, documentNumber: '1040506070', address: 'Av. El Poblado #8A-25', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Juliana Marcela Duarte', email: 'juliana.duarte@email.com', phone: '+57 300 100 0004', documentType: 'CC' as const, documentNumber: '1050607080', address: 'Calle 33 #65-20', city: 'Envigado', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Santiago José Moreno', email: 'santiago.moreno@email.com', phone: '+57 300 100 0005', documentType: 'CC' as const, documentNumber: '1060708090', address: 'Carrera 43A #1S-50', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Valentina Sofía Quintero', email: 'valentina.quintero@email.com', phone: '+57 300 100 0006', documentType: 'CC' as const, documentNumber: '1070809010', address: 'Calle 50 #40-30', city: 'Bello', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Daniel Esteban Herrera', email: 'daniel.herrera@email.com', phone: '+57 300 100 0007', documentType: 'CC' as const, documentNumber: '1080901020', address: 'Av. 80 #32-45', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Camila Andrea Ospina', email: 'camila.ospina@email.com', phone: '+57 300 100 0008', documentType: 'CC' as const, documentNumber: '1090102030', address: 'Calle 7 #42-18', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Sebastián David Muñoz', email: 'sebastian.munoz@email.com', phone: '+57 300 100 0009', documentType: 'CC' as const, documentNumber: '1100203040', address: 'Carrera 48 #10-45', city: 'Itagüí', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Isabella María Torres', email: 'isabella.torres@email.com', phone: '+57 300 100 0010', documentType: 'CC' as const, documentNumber: '1110304050', address: 'Calle 30A #82-10', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Mateo Alejandro Vargas', email: 'mateo.vargas@email.com', phone: '+57 300 100 0011', documentType: 'CC' as const, documentNumber: '1120405060', address: 'Av. Las Palmas #25-60', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Sara Lucía Cardona', email: 'sara.cardona@email.com', phone: '+57 300 100 0012', documentType: 'CC' as const, documentNumber: '1130506070', address: 'Carrera 25 #1A-50', city: 'Envigado', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Nicolás Andrés Mejía', email: 'nicolas.mejia@email.com', phone: '+57 300 100 0013', documentType: 'CC' as const, documentNumber: '1140607080', address: 'Calle 44 #68-12', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Mariana Alejandra Ruiz', email: null, phone: '+57 300 100 0014', documentType: 'CC' as const, documentNumber: '1150708090', address: 'Carrera 80 #34-20', city: 'Medellín', state: 'Antioquia', status: 'INACTIVE' as const },
    { name: 'Tomás Felipe Salazar', email: null, phone: '+57 300 100 0015', documentType: 'CC' as const, documentNumber: '1160809010', address: 'Calle 52 #43-60', city: 'Bello', state: 'Antioquia', status: 'INACTIVE' as const },
    // Empresas NIT
    { name: 'Inversiones El Poblado S.A.S', email: 'contacto@invelpoblado.com', phone: '+57 4 444 1111', documentType: 'NIT' as const, documentNumber: '900123456-1', address: 'Calle 10 #40-20 Of 301', city: 'Medellín', state: 'Antioquia', businessName: 'Inversiones El Poblado S.A.S', taxId: '900123456-1', status: 'ACTIVE' as const },
    { name: 'TechSolutions Colombia', email: 'info@techsolutions.co', phone: '+57 4 444 2222', documentType: 'NIT' as const, documentNumber: '900234567-2', address: 'Carrera 43A #14-109', city: 'Medellín', state: 'Antioquia', businessName: 'TechSolutions Colombia S.A.S', taxId: '900234567-2', status: 'ACTIVE' as const },
    { name: 'Distribuciones ABC Ltda', email: 'ventas@distabc.com', phone: '+57 4 444 3333', documentType: 'NIT' as const, documentNumber: '900345678-3', address: 'Zona Industrial Guayabal', city: 'Medellín', state: 'Antioquia', businessName: 'Distribuciones ABC Ltda', taxId: '900345678-3', status: 'ACTIVE' as const },
    { name: 'Hotel Boutique Laureles', email: 'reservas@hotellaureles.com', phone: '+57 4 444 4444', documentType: 'NIT' as const, documentNumber: '900456789-4', address: 'Circular 73A #39-30', city: 'Medellín', state: 'Antioquia', businessName: 'Hotel Boutique Laureles S.A.S', taxId: '900456789-4', status: 'ACTIVE' as const },
    { name: 'Restaurante Sabor Paisa', email: 'admin@saborpaisa.co', phone: '+57 4 444 5556', documentType: 'NIT' as const, documentNumber: '900567890-5', address: 'Calle 33 #76-20', city: 'Medellín', state: 'Antioquia', businessName: 'Restaurante Sabor Paisa S.A.S', taxId: '900567890-5', status: 'ACTIVE' as const },
    { name: 'Constructora Antioquia', email: 'proyectos@construant.com', phone: '+57 4 444 6666', documentType: 'NIT' as const, documentNumber: '900678901-6', address: 'Av. El Poblado #12-80', city: 'Medellín', state: 'Antioquia', businessName: 'Constructora Antioquia S.A', taxId: '900678901-6', status: 'ACTIVE' as const },
    { name: 'Farmacia Vida Sana', email: 'pedidos@vidasana.co', phone: '+57 4 444 7777', documentType: 'NIT' as const, documentNumber: '900789012-7', address: 'Carrera 50 #48-30', city: 'Bello', state: 'Antioquia', businessName: 'Farmacia Vida Sana S.A.S', taxId: '900789012-7', status: 'ACTIVE' as const },
    { name: 'Colegio Los Andes', email: 'compras@colegiolosandes.edu.co', phone: '+57 4 444 8888', documentType: 'NIT' as const, documentNumber: '900890123-8', address: 'Calle 20 Sur #43-10', city: 'Envigado', state: 'Antioquia', businessName: 'Colegio Los Andes', taxId: '900890123-8', status: 'ACTIVE' as const },
    // CE y PASSPORT para cobertura de enum
    { name: 'Jean Pierre Dubois', email: 'jpdubois@email.com', phone: '+57 300 100 0016', documentType: 'CE' as const, documentNumber: 'CE-123456', address: 'Calle 9 #43A-28', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Emily Johnson', email: 'emily.j@email.com', phone: '+57 300 100 0017', documentType: 'PASSPORT' as const, documentNumber: 'US-987654321', address: 'El Poblado, Loma Los Balsos', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
  ];

  ctx.customers.demo = [];
  for (const c of demoCustomersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: demoTenantId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        documentType: c.documentType as any,
        documentNumber: c.documentNumber,
        address: c.address,
        city: c.city,
        state: c.state,
        businessName: (c as any).businessName || null,
        taxId: (c as any).taxId || null,
        status: c.status as any,
      },
    });
    ctx.customers.demo.push({
      id: created.id,
      name: created.name,
      email: c.email,
      status: c.status,
    });
  }
  console.log(`    ✓ ${ctx.customers.demo.length} demo customers created`);

  // ── Distribuidora Nacional Customers (15) ─────────────────────────
  const distribuidoraTenantId = ctx.tenants.distribuidora.id;
  console.log('  → Distribuidora tenant customers...');

  const distribuidoraCustomersData = [
    { name: 'Supermercado La Economía', email: 'compras@laeconomia.co', phone: '+57 1 300 0001', documentType: 'NIT' as const, documentNumber: '800100200-1', address: 'Cra 7 #45-20', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Supermercado La Economía S.A.S', taxId: '800100200-1', status: 'ACTIVE' as const },
    { name: 'Tienda Don José', email: 'donjose@email.com', phone: '+57 1 300 0002', documentType: 'CC' as const, documentNumber: '79800100', address: 'Calle 68 #15-30', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' as const },
    { name: 'Minimercado El Vecino', email: 'elvecino@email.com', phone: '+57 1 300 0003', documentType: 'NIT' as const, documentNumber: '800200300-2', address: 'Av. Boyacá #72-18', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Minimercado El Vecino Ltda', taxId: '800200300-2', status: 'ACTIVE' as const },
    { name: 'Droguería Farma Plus', email: 'pedidos@farmaplus.co', phone: '+57 1 300 0004', documentType: 'NIT' as const, documentNumber: '800300400-3', address: 'Carrera 13 #60-50', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Droguería Farma Plus S.A.S', taxId: '800300400-3', status: 'ACTIVE' as const },
    { name: 'Restaurante El Sazón', email: 'compras@elsazon.co', phone: '+57 1 300 0005', documentType: 'NIT' as const, documentNumber: '800400500-4', address: 'Calle 85 #11-53', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Restaurante El Sazón S.A.S', taxId: '800400500-4', status: 'ACTIVE' as const },
    { name: 'Panadería Pan de Vida', email: 'pandevida@email.com', phone: '+57 1 300 0006', documentType: 'NIT' as const, documentNumber: '800500600-5', address: 'Av. Suba #115-20', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Panadería Pan de Vida S.A.S', taxId: '800500600-5', status: 'ACTIVE' as const },
    { name: 'Hotel Capital Plaza', email: 'suministros@capitalplaza.co', phone: '+57 1 300 0007', documentType: 'NIT' as const, documentNumber: '800600700-6', address: 'Calle 26 #69-76', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Hotel Capital Plaza S.A', taxId: '800600700-6', status: 'ACTIVE' as const },
    { name: 'Cafetería Aroma', email: 'aroma@email.com', phone: '+57 1 300 0008', documentType: 'CC' as const, documentNumber: '79900200', address: 'Carrera 11 #93-40', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' as const },
    { name: 'Colegio Nueva Granada', email: 'compras@nuevagranada.edu.co', phone: '+57 1 300 0009', documentType: 'NIT' as const, documentNumber: '800700800-7', address: 'Calle 200 #70-30', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Colegio Nueva Granada', taxId: '800700800-7', status: 'ACTIVE' as const },
    { name: 'Tienda Naturista Vida', email: 'vida.naturista@email.com', phone: '+57 1 300 0010', documentType: 'CC' as const, documentNumber: '52100300', address: 'Calle 53 #13-40', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' as const },
    { name: 'Distribuidora El Sol', email: 'pedidos@distsol.co', phone: '+57 1 300 0011', documentType: 'NIT' as const, documentNumber: '800800900-8', address: 'Av. 68 #17-50', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Distribuidora El Sol S.A.S', taxId: '800800900-8', status: 'ACTIVE' as const },
    { name: 'Casino Las Américas', email: 'casino@lasamericas.co', phone: '+57 1 300 0012', documentType: 'NIT' as const, documentNumber: '800901000-9', address: 'Cra 59A #26-20', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Casino Las Américas S.A.S', taxId: '800901000-9', status: 'ACTIVE' as const },
    { name: 'María Elena Pardo', email: 'mepardo@email.com', phone: '+57 1 300 0013', documentType: 'CC' as const, documentNumber: '52200400', address: 'Carrera 9 #74-08', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' as const },
    { name: 'Club Deportivo Norte', email: 'suministros@clubnorte.co', phone: '+57 1 300 0014', documentType: 'NIT' as const, documentNumber: '801000100-0', address: 'Autopista Norte Km 7', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Club Deportivo Norte', taxId: '801000100-0', status: 'ACTIVE' as const },
    { name: 'Ferretería El Maestro', email: 'elmaestro@email.com', phone: '+57 1 300 0015', documentType: 'NIT' as const, documentNumber: '801100200-1', address: 'Calle 13 #32-45', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Ferretería El Maestro Ltda', taxId: '801100200-1', status: 'ACTIVE' as const },
  ];

  ctx.customers.distribuidora = [];
  for (const c of distribuidoraCustomersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: distribuidoraTenantId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        documentType: c.documentType as any,
        documentNumber: c.documentNumber,
        address: c.address,
        city: c.city,
        state: c.state,
        businessName: (c as any).businessName || null,
        taxId: (c as any).taxId || null,
        status: c.status as any,
      },
    });
    ctx.customers.distribuidora.push({
      id: created.id,
      name: created.name,
      email: c.email,
      status: c.status,
    });
  }
  console.log(
    `    ✓ ${ctx.customers.distribuidora.length} distribuidora customers created`,
  );

  // ── Nuevo Negocio Customers (5) ──────────────────────────────────
  const nuevoTenantId = ctx.tenants.nuevo.id;
  console.log('  → Nuevo Negocio tenant customers...');

  const nuevoCustomersData = [
    { name: 'Daniela Monsalve', email: 'daniela.m@email.com', phone: '+57 311 600 0001', documentType: 'CC' as const, documentNumber: '1040200300', address: 'Calle 45 #79-10', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Juan Esteban Arango', email: 'juane.arango@email.com', phone: '+57 311 600 0002', documentType: 'CC' as const, documentNumber: '1050300400', address: 'Carrera 65 #48-20', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Paulina Restrepo', email: 'paulina.r@email.com', phone: '+57 311 600 0003', documentType: 'CC' as const, documentNumber: '1060400500', address: 'Av. Nutibara #10-30', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Felipe Zuluaga', email: 'felipe.z@email.com', phone: '+57 311 600 0004', documentType: 'CC' as const, documentNumber: '1070500600', address: 'Calle 30 #43-55', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Manuela Botero', email: 'manuela.b@email.com', phone: '+57 311 600 0005', documentType: 'CC' as const, documentNumber: '1080600700', address: 'Carrera 70 #30-15', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
  ];

  ctx.customers.nuevo = [];
  for (const c of nuevoCustomersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: nuevoTenantId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        documentType: c.documentType as any,
        documentNumber: c.documentNumber,
        address: c.address,
        city: c.city,
        state: c.state,
        status: c.status as any,
      },
    });
    ctx.customers.nuevo.push({
      id: created.id,
      name: created.name,
      email: c.email,
      status: c.status,
    });
  }
  console.log(
    `    ✓ ${ctx.customers.nuevo.length} nuevo negocio customers created`,
  );

  // ── Papelería Central Customers (12) ─────────────────────────────
  const papeleriaTenantId = ctx.tenants.papeleria.id;
  console.log('  → Papelería tenant customers...');

  const papeleriaCustomersData = [
    { name: 'Ana María Velásquez', email: 'ana.velasquez@email.com', phone: '+57 4 500 0001', documentType: 'CC' as const, documentNumber: '1090100200', address: 'Calle 10 #30-15', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Diego Armando Patiño', email: 'diego.patino@email.com', phone: '+57 4 500 0002', documentType: 'CC' as const, documentNumber: '1100200300', address: 'Carrera 52 #49-20', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Colegio San José', email: 'compras@colegiosanjose.edu.co', phone: '+57 4 500 0003', documentType: 'NIT' as const, documentNumber: '811100200-1', address: 'Calle 45 #65-30', city: 'Medellín', state: 'Antioquia', businessName: 'Colegio San José', taxId: '811100200-1', status: 'ACTIVE' as const },
    { name: 'Oficinas Creativas S.A.S', email: 'admin@oficinascreativas.co', phone: '+57 4 500 0004', documentType: 'NIT' as const, documentNumber: '811200300-2', address: 'Av. El Poblado #7-40', city: 'Medellín', state: 'Antioquia', businessName: 'Oficinas Creativas S.A.S', taxId: '811200300-2', status: 'ACTIVE' as const },
    { name: 'Paula Andrea Giraldo', email: 'paula.giraldo@email.com', phone: '+57 4 500 0005', documentType: 'CC' as const, documentNumber: '1110300400', address: 'Carrera 43 #30-25', city: 'Envigado', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Instituto Técnico Industrial', email: 'compras@iti.edu.co', phone: '+57 4 500 0006', documentType: 'NIT' as const, documentNumber: '811300400-3', address: 'Calle 80 #55-20', city: 'Medellín', state: 'Antioquia', businessName: 'Instituto Técnico Industrial', taxId: '811300400-3', status: 'ACTIVE' as const },
    { name: 'Roberto Carlos Ossa', email: 'roberto.ossa@email.com', phone: '+57 4 500 0007', documentType: 'CC' as const, documentNumber: '1120400500', address: 'Calle 33 #78-10', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Librería El Saber', email: 'libreria@elsaber.co', phone: '+57 4 500 0008', documentType: 'NIT' as const, documentNumber: '811400500-4', address: 'Carrera 49 #52-30', city: 'Medellín', state: 'Antioquia', businessName: 'Librería El Saber Ltda', taxId: '811400500-4', status: 'ACTIVE' as const },
    { name: 'Lucía Fernanda Castro', email: 'lucia.castro@email.com', phone: '+57 4 500 0009', documentType: 'CC' as const, documentNumber: '1130500600', address: 'Av. 80 #24-30', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Empresa de Diseño Gráfico', email: 'contacto@diseno.co', phone: '+57 4 500 0010', documentType: 'NIT' as const, documentNumber: '811500600-5', address: 'Calle 7 #43-28', city: 'Medellín', state: 'Antioquia', businessName: 'Diseño Gráfico S.A.S', taxId: '811500600-5', status: 'ACTIVE' as const },
    { name: 'Jorge Iván Montoya', email: 'jorge.montoya@email.com', phone: '+57 4 500 0011', documentType: 'CC' as const, documentNumber: '1140600700', address: 'Carrera 70 #48-15', city: 'Bello', state: 'Antioquia', status: 'ACTIVE' as const },
    { name: 'Jardín Infantil Arcoíris', email: 'jardin@arcoiris.edu.co', phone: '+57 4 500 0012', documentType: 'NIT' as const, documentNumber: '811600700-6', address: 'Calle 50 #80-10', city: 'Medellín', state: 'Antioquia', businessName: 'Jardín Infantil Arcoíris', taxId: '811600700-6', status: 'ACTIVE' as const },
  ];

  ctx.customers.papeleria = [];
  for (const c of papeleriaCustomersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: papeleriaTenantId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        documentType: c.documentType as any,
        documentNumber: c.documentNumber,
        address: c.address,
        city: c.city,
        state: c.state,
        businessName: (c as any).businessName || null,
        taxId: (c as any).taxId || null,
        status: c.status as any,
      },
    });
    ctx.customers.papeleria.push({
      id: created.id,
      name: created.name,
      email: c.email,
      status: c.status,
    });
  }
  console.log(
    `    ✓ ${ctx.customers.papeleria.length} papelería customers created`,
  );

  console.log(
    `✅ Customers seeded: ${ctx.customers.demo.length + ctx.customers.distribuidora.length + ctx.customers.nuevo.length + ctx.customers.papeleria.length} total`,
  );
}
