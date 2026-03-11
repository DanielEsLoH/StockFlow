import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo } from './helpers';

export async function seedPayroll(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('👔 Creating Payroll data...');

  // ── PayrollConfig ──
  await prisma.payrollConfig.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      smmlv: 1423500,
      auxilioTransporteVal: 200000,
      uvtValue: 49799,
      payrollPrefix: 'NE',
      adjustmentPrefix: 'NA',
      defaultPeriodType: 'MONTHLY',
    },
  });
  await prisma.payrollConfig.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      smmlv: 1423500,
      auxilioTransporteVal: 200000,
      uvtValue: 49799,
      payrollPrefix: 'NE',
      adjustmentPrefix: 'NA',
      defaultPeriodType: 'MONTHLY',
    },
  });

  console.log('   ✅ 2 Payroll Configs created');

  // ── Employees — Tienda Demo (6 empleados variados) ──
  const empCarlos = await prisma.employee.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      documentType: 'CC', documentNumber: '1012345678',
      firstName: 'Carlos', lastName: 'Mendoza',
      email: 'carlos.mendoza@tienda-demo.com', phone: '+57 300 111 2222',
      address: 'Calle 45 #12-30', city: 'Bogotá', cityCode: '11001',
      department: 'Bogotá D.C.', departmentCode: '11',
      contractType: 'TERMINO_INDEFINIDO', salaryType: 'ORDINARIO',
      baseSalary: 1423500, auxilioTransporte: true,
      arlRiskLevel: 'LEVEL_I',
      epsName: 'Sura EPS', epsCode: 'EPS010',
      afpName: 'Protección', afpCode: 'CCF230101',
      cajaName: 'Comfenalco', cajaCode: 'CCF04',
      bankName: 'Bancolombia', bankAccountType: 'AHORROS', bankAccountNumber: '12345678901',
      startDate: daysAgo(730), status: 'ACTIVE',
    },
  });

  const empMaria = await prisma.employee.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      documentType: 'CC', documentNumber: '1098765432',
      firstName: 'María', lastName: 'López',
      email: 'maria.lopez@tienda-demo.com', phone: '+57 310 222 3333',
      address: 'Carrera 7 #80-15', city: 'Bogotá', cityCode: '11001',
      department: 'Bogotá D.C.', departmentCode: '11',
      contractType: 'TERMINO_INDEFINIDO', salaryType: 'ORDINARIO',
      baseSalary: 3500000, auxilioTransporte: false,
      arlRiskLevel: 'LEVEL_I',
      epsName: 'Nueva EPS', epsCode: 'EPS037',
      afpName: 'Porvenir', afpCode: 'CCF230201',
      cajaName: 'Compensar', cajaCode: 'CCF02',
      bankName: 'Davivienda', bankAccountType: 'CORRIENTE', bankAccountNumber: '98765432100',
      startDate: daysAgo(540), status: 'ACTIVE',
    },
  });

  const empJuan = await prisma.employee.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      documentType: 'CC', documentNumber: '1055443322',
      firstName: 'Juan', lastName: 'Rodríguez',
      email: 'juan.rodriguez@tienda-demo.com', phone: '+57 320 444 5555',
      address: 'Avenida 19 #100-45', city: 'Bogotá', cityCode: '11001',
      department: 'Bogotá D.C.', departmentCode: '11',
      contractType: 'TERMINO_INDEFINIDO', salaryType: 'INTEGRAL',
      baseSalary: 18500000, auxilioTransporte: false,
      arlRiskLevel: 'LEVEL_I',
      epsName: 'Sanitas', epsCode: 'EPS005',
      afpName: 'Old Mutual', afpCode: 'CCF230301',
      cajaName: 'Colsubsidio', cajaCode: 'CCF03',
      bankName: 'Banco de Bogotá', bankAccountType: 'AHORROS', bankAccountNumber: '55566677788',
      startDate: daysAgo(365), status: 'ACTIVE',
    },
  });

  const empAna = await prisma.employee.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      documentType: 'CC', documentNumber: '1033221100',
      firstName: 'Ana', lastName: 'Torres',
      email: 'ana.torres@tienda-demo.com', phone: '+57 315 666 7777',
      address: 'Calle 100 #15-20', city: 'Bogotá', cityCode: '11001',
      department: 'Bogotá D.C.', departmentCode: '11',
      contractType: 'TERMINO_FIJO', salaryType: 'ORDINARIO',
      baseSalary: 2000000, auxilioTransporte: true,
      arlRiskLevel: 'LEVEL_II',
      epsName: 'Famisanar', epsCode: 'EPS017',
      afpName: 'Colfondos', afpCode: 'CCF230401',
      cajaName: 'Cafam', cajaCode: 'CCF01',
      bankName: 'Bancolombia', bankAccountType: 'AHORROS', bankAccountNumber: '44433322211',
      startDate: daysAgo(180), status: 'ACTIVE',
    },
  });

  // Pedro — ON_LEAVE
  await prisma.employee.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      documentType: 'CC', documentNumber: '1077889900',
      firstName: 'Pedro', lastName: 'Gómez',
      email: 'pedro.gomez@tienda-demo.com', phone: '+57 301 888 9999',
      address: 'Carrera 30 #50-10', city: 'Bogotá', cityCode: '11001',
      department: 'Bogotá D.C.', departmentCode: '11',
      contractType: 'OBRA_O_LABOR', salaryType: 'ORDINARIO',
      baseSalary: 1800000, auxilioTransporte: true,
      arlRiskLevel: 'LEVEL_III',
      epsName: 'Sura EPS', epsCode: 'EPS010',
      afpName: 'Protección', afpCode: 'CCF230101',
      cajaName: 'Comfenalco', cajaCode: 'CCF04',
      bankName: 'Nequi', bankAccountType: 'AHORROS', bankAccountNumber: '3018889999',
      startDate: daysAgo(300), status: 'ON_LEAVE',
    },
  });

  // Laura — TERMINATED
  await prisma.employee.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      documentType: 'CC', documentNumber: '1066554433',
      firstName: 'Laura', lastName: 'Díaz',
      email: 'laura.diaz@tienda-demo.com', phone: '+57 318 000 1111',
      address: 'Calle 72 #10-05', city: 'Bogotá', cityCode: '11001',
      department: 'Bogotá D.C.', departmentCode: '11',
      contractType: 'TERMINO_INDEFINIDO', salaryType: 'ORDINARIO',
      baseSalary: 2500000, auxilioTransporte: true,
      arlRiskLevel: 'LEVEL_I',
      epsName: 'Nueva EPS', epsCode: 'EPS037',
      afpName: 'Porvenir', afpCode: 'CCF230201',
      cajaName: 'Compensar', cajaCode: 'CCF02',
      bankName: 'Davivienda', bankAccountType: 'AHORROS', bankAccountNumber: '66677788899',
      startDate: daysAgo(500), endDate: daysAgo(30), status: 'TERMINATED',
    },
  });

  // ── Employees — Distribuidora Nacional (2) ──
  const empAndres = await prisma.employee.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      documentType: 'CC', documentNumber: '1044332211',
      firstName: 'Andrés', lastName: 'Martínez',
      email: 'andres.martinez@distribuidoranacional.com', phone: '+57 312 333 4444',
      address: 'Calle 10 #25-40', city: 'Medellín', cityCode: '05001',
      department: 'Antioquia', departmentCode: '05',
      contractType: 'TERMINO_INDEFINIDO', salaryType: 'ORDINARIO',
      baseSalary: 1800000, auxilioTransporte: true,
      arlRiskLevel: 'LEVEL_II',
      epsName: 'Sura EPS', epsCode: 'EPS010',
      afpName: 'Protección', afpCode: 'CCF230101',
      cajaName: 'Comfama', cajaCode: 'CCF05',
      bankName: 'Bancolombia', bankAccountType: 'AHORROS', bankAccountNumber: '11122233344',
      startDate: daysAgo(400), status: 'ACTIVE',
    },
  });

  const empSofia = await prisma.employee.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      documentType: 'CC', documentNumber: '1099887766',
      firstName: 'Sofía', lastName: 'Ramírez',
      email: 'sofia.ramirez@distribuidoranacional.com', phone: '+57 305 555 6666',
      address: 'Carrera 43A #1-50', city: 'Medellín', cityCode: '05001',
      department: 'Antioquia', departmentCode: '05',
      contractType: 'TERMINO_INDEFINIDO', salaryType: 'ORDINARIO',
      baseSalary: 4200000, auxilioTransporte: false,
      arlRiskLevel: 'LEVEL_I',
      epsName: 'Nueva EPS', epsCode: 'EPS037',
      afpName: 'Porvenir', afpCode: 'CCF230201',
      cajaName: 'Comfama', cajaCode: 'CCF05',
      bankName: 'Davivienda', bankAccountType: 'CORRIENTE', bankAccountNumber: '55544433322',
      startDate: daysAgo(250), status: 'ACTIVE',
    },
  });

  console.log('   ✅ 8 Employees created (6 Demo + 2 Distribuidora)');

  // ── PayrollPeriods ──
  const periodDemoDic = await prisma.payrollPeriod.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      name: 'Diciembre 2025', periodType: 'MONTHLY',
      startDate: new Date('2025-12-01'), endDate: new Date('2025-12-31'),
      paymentDate: new Date('2025-12-31'), status: 'CLOSED',
      employeeCount: 4, totalDevengados: 25723500, totalDeducciones: 2213480, totalNeto: 23510020,
    },
  });

  const periodDemoEne = await prisma.payrollPeriod.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      name: 'Enero 2026', periodType: 'MONTHLY',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31'),
      paymentDate: new Date('2026-01-31'), status: 'APPROVED',
      employeeCount: 4, totalDevengados: 25723500, totalDeducciones: 2213480, totalNeto: 23510020,
      approvedAt: new Date('2026-01-28'),
    },
  });

  await prisma.payrollPeriod.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      name: 'Febrero 2026', periodType: 'MONTHLY',
      startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28'),
      status: 'OPEN',
    },
  });

  const periodDnEne = await prisma.payrollPeriod.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      name: 'Enero 2026', periodType: 'MONTHLY',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31'),
      paymentDate: new Date('2026-01-31'), status: 'CALCULATED',
      employeeCount: 2, totalDevengados: 6200000, totalDeducciones: 492000, totalNeto: 5708000,
    },
  });

  console.log('   ✅ 4 Payroll Periods created (3 Demo + 1 Distribuidora)');

  // ── PayrollEntries ──
  const createEntry = async (
    tenantId: string, periodId: string, employeeId: string,
    entryNumber: string, status: string, data: Record<string, any>,
  ) => {
    await prisma.payrollEntry.create({
      data: {
        tenantId, periodId, employeeId, entryNumber, status: status as any,
        baseSalary: data.baseSalary, salaryType: data.salaryType ?? 'ORDINARIO',
        daysWorked: data.daysWorked ?? 30, sueldo: data.sueldo,
        auxilioTransporte: data.auxilioTransporte ?? 0,
        horasExtras: data.horasExtras ?? 0, bonificaciones: data.bonificaciones ?? 0,
        comisiones: data.comisiones ?? 0, viaticos: data.viaticos ?? 0,
        incapacidad: data.incapacidad ?? 0, licencia: data.licencia ?? 0,
        vacaciones: data.vacaciones ?? 0, otrosDevengados: data.otrosDevengados ?? 0,
        totalDevengados: data.totalDevengados,
        saludEmpleado: data.saludEmpleado, pensionEmpleado: data.pensionEmpleado,
        fondoSolidaridad: data.fondoSolidaridad ?? 0,
        retencionFuente: data.retencionFuente ?? 0,
        sindicato: data.sindicato ?? 0, libranzas: data.libranzas ?? 0,
        otrasDeducciones: data.otrasDeducciones ?? 0,
        totalDeducciones: data.totalDeducciones,
        saludEmpleador: data.saludEmpleador ?? 0, pensionEmpleador: data.pensionEmpleador ?? 0,
        arlEmpleador: data.arlEmpleador ?? 0, cajaEmpleador: data.cajaEmpleador ?? 0,
        senaEmpleador: data.senaEmpleador ?? 0, icbfEmpleador: data.icbfEmpleador ?? 0,
        provisionPrima: data.provisionPrima ?? 0, provisionCesantias: data.provisionCesantias ?? 0,
        provisionIntereses: data.provisionIntereses ?? 0, provisionVacaciones: data.provisionVacaciones ?? 0,
        totalNeto: data.totalNeto,
      },
    });
  };

  // Carlos: SMMLV 1,423,500 + auxilio 200,000 = 1,623,500 devengados
  const carlosData = {
    baseSalary: 1423500, sueldo: 1423500, auxilioTransporte: 200000,
    totalDevengados: 1623500,
    saludEmpleado: 56940, pensionEmpleado: 56940, totalDeducciones: 113880, totalNeto: 1509620,
    saludEmpleador: 120998, pensionEmpleador: 170820, arlEmpleador: 7431, cajaEmpleador: 56940, senaEmpleador: 28470, icbfEmpleador: 42705,
    provisionPrima: 118594, provisionCesantias: 118594, provisionIntereses: 14231, provisionVacaciones: 59370,
  };

  // María: 3,500,000 sin auxilio (>2 SMMLV)
  const mariaData = {
    baseSalary: 3500000, sueldo: 3500000, auxilioTransporte: 0,
    totalDevengados: 3500000,
    saludEmpleado: 140000, pensionEmpleado: 140000, totalDeducciones: 280000, totalNeto: 3220000,
    saludEmpleador: 297500, pensionEmpleador: 420000, arlEmpleador: 18270, cajaEmpleador: 140000, senaEmpleador: 70000, icbfEmpleador: 105000,
    provisionPrima: 291550, provisionCesantias: 291550, provisionIntereses: 34986, provisionVacaciones: 145950,
  };

  // Juan: Integral 18,500,000 — IBC = 70% = 12,950,000
  const juanData = {
    baseSalary: 18500000, salaryType: 'INTEGRAL', sueldo: 18500000, auxilioTransporte: 0,
    totalDevengados: 18500000,
    saludEmpleado: 518000, pensionEmpleado: 518000, fondoSolidaridad: 129500,
    retencionFuente: 2872780,
    totalDeducciones: 4038280, totalNeto: 14461720,
    saludEmpleador: 1100750, pensionEmpleador: 1554000, arlEmpleador: 67599, cajaEmpleador: 518000, senaEmpleador: 259000, icbfEmpleador: 388500,
    provisionPrima: 0, provisionCesantias: 0, provisionIntereses: 0, provisionVacaciones: 0,
  };

  // Ana: 2,000,000 + auxilio, ARL II (1.044%)
  const anaData = {
    baseSalary: 2000000, sueldo: 2000000, auxilioTransporte: 200000,
    totalDevengados: 2200000,
    saludEmpleado: 80000, pensionEmpleado: 80000, totalDeducciones: 160000, totalNeto: 2040000,
    saludEmpleador: 170000, pensionEmpleador: 240000, arlEmpleador: 20880, cajaEmpleador: 80000, senaEmpleador: 40000, icbfEmpleador: 60000,
    provisionPrima: 166600, provisionCesantias: 166600, provisionIntereses: 19992, provisionVacaciones: 83400,
  };

  // Dic 2025 entries (CLOSED → ACCEPTED)
  let entryCounter = 1;
  for (const [empId, data] of [
    [empCarlos.id, carlosData], [empMaria.id, mariaData],
    [empJuan.id, juanData], [empAna.id, anaData],
  ] as [string, Record<string, any>][]) {
    await createEntry(ctx.tenants.demo.id, periodDemoDic.id, empId, `NE-${String(entryCounter).padStart(4, '0')}`, 'ACCEPTED', data);
    entryCounter++;
  }

  // Ene 2026 entries (APPROVED)
  for (const [empId, data] of [
    [empCarlos.id, carlosData], [empMaria.id, mariaData],
    [empJuan.id, juanData], [empAna.id, anaData],
  ] as [string, Record<string, any>][]) {
    await createEntry(ctx.tenants.demo.id, periodDemoEne.id, empId, `NE-${String(entryCounter).padStart(4, '0')}`, 'APPROVED', data);
    entryCounter++;
  }

  // Distribuidora: Ene 2026 (CALCULATED)
  const andresData = {
    baseSalary: 1800000, sueldo: 1800000, auxilioTransporte: 200000,
    totalDevengados: 2000000,
    saludEmpleado: 72000, pensionEmpleado: 72000, totalDeducciones: 144000, totalNeto: 1856000,
    saludEmpleador: 153000, pensionEmpleador: 216000, arlEmpleador: 18792, cajaEmpleador: 72000, senaEmpleador: 36000, icbfEmpleador: 54000,
    provisionPrima: 149940, provisionCesantias: 149940, provisionIntereses: 17993, provisionVacaciones: 75060,
  };

  const sofiaData = {
    baseSalary: 4200000, sueldo: 4200000, auxilioTransporte: 0,
    totalDevengados: 4200000,
    saludEmpleado: 168000, pensionEmpleado: 168000, totalDeducciones: 336000, totalNeto: 3864000,
    saludEmpleador: 357000, pensionEmpleador: 504000, arlEmpleador: 21924, cajaEmpleador: 168000, senaEmpleador: 84000, icbfEmpleador: 126000,
    provisionPrima: 349860, provisionCesantias: 349860, provisionIntereses: 41983, provisionVacaciones: 175140,
  };

  await createEntry(ctx.tenants.distribuidora.id, periodDnEne.id, empAndres.id, 'NE-0001', 'CALCULATED', andresData);
  await createEntry(ctx.tenants.distribuidora.id, periodDnEne.id, empSofia.id, 'NE-0002', 'CALCULATED', sofiaData);

  console.log('   ✅ 10 Payroll Entries created (8 Demo + 2 Distribuidora)');
  console.log('   ✅ Payroll data complete');
}
