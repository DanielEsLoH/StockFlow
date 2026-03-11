import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo } from './helpers';
import { randomUUID } from 'crypto';

// ============================================================================
// DIAN (COLOMBIAN TAX AUTHORITY) SEEDER
// ============================================================================

export async function seedDIAN(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('🏛️ Seeding DIAN configuration and documents...');

  // ── Tenant DIAN Configs ──────────────────────────────────────────
  console.log('  → Creating tenant DIAN configs...');

  // Demo — full config, production-like
  await prisma.tenantDianConfig.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      nit: '901234567',
      dv: '1',
      businessName: 'Tienda Demo S.A.S.',
      tradeName: 'Tienda Demo',
      taxResponsibilities: ['O_13', 'O_15'],
      economicActivity: '4791 - Comercio al por menor por internet',
      address: 'Cra 15 # 88-64, Oficina 301',
      city: 'Bogotá D.C.',
      cityCode: '11001',
      department: 'Bogotá D.C.',
      departmentCode: '11',
      country: 'CO',
      countryCode: 'CO',
      postalCode: '110221',
      phone: '+57 601 7654321',
      email: 'facturacion@tienda-demo.com',
      testMode: false,
      softwareId: 'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
      softwarePin: '12345',
      technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38f143',
      resolutionNumber: '18760000001',
      resolutionDate: new Date('2024-01-15'),
      resolutionPrefix: 'SEFT',
      resolutionRangeFrom: 1,
      resolutionRangeTo: 5000,
      currentNumber: 56,
      creditNotePrefix: 'NC',
      creditNoteCurrentNumber: 3,
      debitNotePrefix: 'ND',
      debitNoteCurrentNumber: 1,
      posResolutionNumber: '18760000002',
      posResolutionDate: new Date('2024-01-15'),
      posResolutionPrefix: 'POS',
      posResolutionRangeFrom: 1,
      posResolutionRangeTo: 10000,
      posCurrentNumber: 19,
    },
  });

  // Distribuidora — test mode config
  await prisma.tenantDianConfig.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      nit: '800567890',
      dv: '3',
      businessName: 'Distribuidora Nacional Ltda.',
      tradeName: 'Distribuidora Nacional',
      taxResponsibilities: ['O_13'],
      economicActivity: '4631 - Comercio al por mayor de productos alimenticios',
      address: 'Cra 50 # 10-20, Bodega 5',
      city: 'Medellín',
      cityCode: '05001',
      department: 'Antioquia',
      departmentCode: '05',
      country: 'CO',
      countryCode: 'CO',
      postalCode: '050021',
      phone: '+57 604 3214567',
      email: 'contabilidad@distribuidoranacional.com',
      testMode: true,
      softwareId: '11112222-3333-4444-5555-666677778888',
      softwarePin: '54321',
      technicalKey: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
      resolutionNumber: '18760000045',
      resolutionDate: new Date('2024-03-10'),
      resolutionPrefix: 'SEDN',
      resolutionRangeFrom: 1,
      resolutionRangeTo: 3000,
      currentNumber: 26,
      creditNotePrefix: 'NCDN',
      creditNoteCurrentNumber: 1,
      debitNotePrefix: 'NDDN',
      debitNoteCurrentNumber: 1,
    },
  });

  console.log('    ✓ 2 DIAN configs created (demo, distribuidora)');

  // ── DIAN Documents ───────────────────────────────────────────────
  console.log('  → Creating DIAN documents...');

  let docCount = 0;

  // Demo — create DIAN documents for the first ~15 invoices (SENT/PAID ones)
  const demoSentInvoices = ctx.invoices.demo.filter(
    (inv) => inv.paymentStatus === 'PAID' || inv.paymentStatus === 'PARTIALLY_PAID',
  );

  for (let i = 0; i < Math.min(demoSentInvoices.length, 15); i++) {
    const inv = demoSentInvoices[i];
    const cufe = randomUUID();
    const isAccepted = i < 12; // first 12 accepted, rest pending/rejected
    const isRejected = i >= 13;

    const sentDate = daysAgo(30 - i * 2);
    const acceptedDate = isAccepted
      ? new Date(sentDate.getTime() + randomBetween(30, 120) * 60 * 1000) // 30min-2h after sent
      : null;

    await prisma.dianDocument.create({
      data: {
        tenantId: ctx.tenants.demo.id,
        invoiceId: inv.id,
        documentType: 'FACTURA_ELECTRONICA',
        documentNumber: `SEFT-${String(i + 1).padStart(5, '0')}`,
        cufe,
        qrCode: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`,
        status: isAccepted ? 'ACCEPTED' : isRejected ? 'REJECTED' : 'SENT',
        dianTrackId: randomUUID(),
        dianResponse: isAccepted
          ? ({ IsValid: true, StatusCode: '00', StatusDescription: 'Documento validado por la DIAN' } as any)
          : isRejected
            ? ({ IsValid: false, StatusCode: '99', StatusDescription: 'Rechazo: NIT no coincide con RUT' } as any)
            : undefined,
        errorMessage: isRejected ? 'Rechazo: NIT no coincide con RUT registrado' : null,
        sentAt: sentDate,
        acceptedAt: acceptedDate,
      },
    });
    docCount++;
  }

  // Demo — 2 credit notes linked to first 2 accepted invoices
  for (let i = 0; i < 2 && i < demoSentInvoices.length; i++) {
    const inv = demoSentInvoices[i];
    // Find the original DIAN document for this invoice
    const originalDoc = await prisma.dianDocument.findFirst({
      where: { tenantId: ctx.tenants.demo.id, invoiceId: inv.id },
    });

    if (originalDoc) {
      const cude = randomUUID();
      await prisma.dianDocument.create({
        data: {
          tenantId: ctx.tenants.demo.id,
          originalDianDocumentId: originalDoc.id,
          documentType: 'NOTA_CREDITO',
          documentNumber: `NC-${String(i + 1).padStart(5, '0')}`,
          cude,
          qrCode: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cude}`,
          status: 'ACCEPTED',
          creditNoteReason: i === 0 ? 'Devolución parcial de mercancía' : 'Descuento por pronto pago',
          dianTrackId: randomUUID(),
          dianResponse: { IsValid: true, StatusCode: '00', StatusDescription: 'Nota crédito validada' },
          sentAt: daysAgo(10 - i * 3),
          acceptedAt: daysAgo(10 - i * 3),
        },
      });
      docCount++;
    }
  }

  // Demo — 1 debit note
  if (demoSentInvoices.length >= 3) {
    const originalDoc = await prisma.dianDocument.findFirst({
      where: { tenantId: ctx.tenants.demo.id, invoiceId: demoSentInvoices[2].id },
    });

    if (originalDoc) {
      const cude = randomUUID();
      await prisma.dianDocument.create({
        data: {
          tenantId: ctx.tenants.demo.id,
          originalDianDocumentId: originalDoc.id,
          documentType: 'NOTA_DEBITO',
          documentNumber: 'ND-00001',
          cude,
          qrCode: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cude}`,
          status: 'ACCEPTED',
          dianTrackId: randomUUID(),
          dianResponse: { IsValid: true, StatusCode: '00', StatusDescription: 'Nota débito validada' },
          sentAt: daysAgo(5),
          acceptedAt: daysAgo(5),
        },
      });
      docCount++;
    }
  }

  // Distribuidora — create DIAN documents for first ~8 invoices
  const distSentInvoices = ctx.invoices.distribuidora.filter(
    (inv) => inv.paymentStatus === 'PAID' || inv.paymentStatus === 'PARTIALLY_PAID',
  );

  for (let i = 0; i < Math.min(distSentInvoices.length, 8); i++) {
    const inv = distSentInvoices[i];
    const cufe = randomUUID();
    const isAccepted = i < 6;
    const isPending = i >= 6;

    const sentDate = daysAgo(25 - i * 3);
    const acceptedDate = isAccepted
      ? new Date(sentDate.getTime() + randomBetween(45, 90) * 60 * 1000)
      : null;

    await prisma.dianDocument.create({
      data: {
        tenantId: ctx.tenants.distribuidora.id,
        invoiceId: inv.id,
        documentType: 'FACTURA_ELECTRONICA',
        documentNumber: `SEDN-${String(i + 1).padStart(5, '0')}`,
        cufe,
        qrCode: `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${cufe}`,
        status: isAccepted ? 'ACCEPTED' : 'PENDING',
        dianTrackId: randomUUID(),
        dianResponse: isAccepted
          ? ({ IsValid: true, StatusCode: '00', StatusDescription: 'Documento validado (ambiente pruebas)' } as any)
          : undefined,
        sentAt: isPending ? null : sentDate,
        acceptedAt: acceptedDate,
      },
    });
    docCount++;
  }

  // Distribuidora — 1 credit note
  if (distSentInvoices.length >= 1) {
    const originalDoc = await prisma.dianDocument.findFirst({
      where: { tenantId: ctx.tenants.distribuidora.id, invoiceId: distSentInvoices[0].id },
    });

    if (originalDoc) {
      const cude = randomUUID();
      await prisma.dianDocument.create({
        data: {
          tenantId: ctx.tenants.distribuidora.id,
          originalDianDocumentId: originalDoc.id,
          documentType: 'NOTA_CREDITO',
          documentNumber: 'NCDN-00001',
          cude,
          qrCode: `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${cude}`,
          status: 'ACCEPTED',
          creditNoteReason: 'Anulación de factura por error en NIT del cliente',
          dianTrackId: randomUUID(),
          dianResponse: { IsValid: true, StatusCode: '00', StatusDescription: 'Nota crédito validada (pruebas)' },
          sentAt: daysAgo(8),
          acceptedAt: daysAgo(8),
        },
      });
      docCount++;
    }
  }

  console.log(`    ✓ ${docCount} DIAN documents created`);

  console.log(`✅ DIAN seeded: 2 configs, ${docCount} documents`);
}

// ── Local helper ─────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
