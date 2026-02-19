import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountType, AccountNature } from '@prisma/client';

interface PucAccountSeed {
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  parentCode?: string;
  isBankAccount?: boolean;
}

/**
 * PUC (Plan Unico de Cuentas) seed for Colombian retail businesses.
 * ~55 accounts covering the essential structure for a retail operation.
 */
const PUC_ACCOUNTS: PucAccountSeed[] = [
  // ==================== CLASE 1: ACTIVOS ====================
  { code: '1', name: 'Activos', type: AccountType.ASSET, nature: AccountNature.DEBIT },

  // Grupo 11 - Disponible
  { code: '11', name: 'Disponible', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1' },
  { code: '1105', name: 'Caja', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '11' },
  { code: '110505', name: 'Caja General', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1105' },
  { code: '1110', name: 'Bancos', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '11' },
  { code: '111005', name: 'Bancos Nacionales', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1110', isBankAccount: true },

  // Grupo 13 - Deudores
  { code: '13', name: 'Deudores', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1' },
  { code: '1305', name: 'Clientes', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '13' },
  { code: '130505', name: 'Clientes Nacionales', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1305' },
  { code: '1355', name: 'Anticipo de Impuestos y Contribuciones', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '13' },
  { code: '135515', name: 'Retencion en la Fuente', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1355' },
  { code: '135517', name: 'Impuesto a las Ventas Retenido', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1355' },

  // Grupo 14 - Inventarios
  { code: '14', name: 'Inventarios', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1' },
  { code: '1435', name: 'Mercancias no Fabricadas por la Empresa', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '14' },
  { code: '143505', name: 'Inventario de Mercancias', type: AccountType.ASSET, nature: AccountNature.DEBIT, parentCode: '1435' },

  // ==================== CLASE 2: PASIVOS ====================
  { code: '2', name: 'Pasivos', type: AccountType.LIABILITY, nature: AccountNature.CREDIT },

  // Grupo 22 - Proveedores
  { code: '22', name: 'Proveedores', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2' },
  { code: '2205', name: 'Proveedores Nacionales', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '22' },
  { code: '220505', name: 'Proveedores Nacionales', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2205' },

  // Grupo 23 - Cuentas por Pagar
  { code: '23', name: 'Cuentas por Pagar', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2' },
  { code: '2365', name: 'Retencion en la Fuente', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '23' },
  { code: '236540', name: 'Compras 2.5%', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2365' },

  // Grupo 24 - Impuestos
  { code: '24', name: 'Impuestos, Gravamenes y Tasas', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2' },
  { code: '2408', name: 'Impuesto sobre las Ventas por Pagar', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '24' },
  { code: '240805', name: 'IVA por Pagar 19%', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2408' },
  { code: '240810', name: 'IVA por Pagar 5%', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2408' },
  { code: '2412', name: 'Impuesto sobre las Ventas Descontable', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '24' },
  { code: '241205', name: 'IVA Descontable 19%', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2412' },
  { code: '241210', name: 'IVA Descontable 5%', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2412' },

  // Grupo 25 - Obligaciones Laborales
  { code: '25', name: 'Obligaciones Laborales', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '2' },
  { code: '2505', name: 'Salarios por Pagar', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '25' },
  { code: '2510', name: 'Cesantias Consolidadas', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, parentCode: '25' },

  // ==================== CLASE 3: PATRIMONIO ====================
  { code: '3', name: 'Patrimonio', type: AccountType.EQUITY, nature: AccountNature.CREDIT },

  // Grupo 31 - Capital Social
  { code: '31', name: 'Capital Social', type: AccountType.EQUITY, nature: AccountNature.CREDIT, parentCode: '3' },
  { code: '3105', name: 'Capital Suscrito y Pagado', type: AccountType.EQUITY, nature: AccountNature.CREDIT, parentCode: '31' },

  // Grupo 36 - Resultados del Ejercicio
  { code: '36', name: 'Resultados del Ejercicio', type: AccountType.EQUITY, nature: AccountNature.CREDIT, parentCode: '3' },
  { code: '3605', name: 'Utilidad del Ejercicio', type: AccountType.EQUITY, nature: AccountNature.CREDIT, parentCode: '36' },
  { code: '3610', name: 'Perdida del Ejercicio', type: AccountType.EQUITY, nature: AccountNature.DEBIT, parentCode: '36' },

  // Grupo 37 - Resultados de Ejercicios Anteriores
  { code: '37', name: 'Resultados de Ejercicios Anteriores', type: AccountType.EQUITY, nature: AccountNature.CREDIT, parentCode: '3' },
  { code: '3705', name: 'Utilidades Acumuladas', type: AccountType.EQUITY, nature: AccountNature.CREDIT, parentCode: '37' },
  { code: '3710', name: 'Perdidas Acumuladas', type: AccountType.EQUITY, nature: AccountNature.DEBIT, parentCode: '37' },

  // ==================== CLASE 4: INGRESOS ====================
  { code: '4', name: 'Ingresos', type: AccountType.REVENUE, nature: AccountNature.CREDIT },

  // Grupo 41 - Operacionales
  { code: '41', name: 'Operacionales', type: AccountType.REVENUE, nature: AccountNature.CREDIT, parentCode: '4' },
  { code: '4135', name: 'Comercio al por Mayor y Menor', type: AccountType.REVENUE, nature: AccountNature.CREDIT, parentCode: '41' },
  { code: '413505', name: 'Ventas de Mercancias', type: AccountType.REVENUE, nature: AccountNature.CREDIT, parentCode: '4135' },

  // Grupo 42 - No Operacionales
  { code: '42', name: 'No Operacionales', type: AccountType.REVENUE, nature: AccountNature.CREDIT, parentCode: '4' },
  { code: '4295', name: 'Diversos', type: AccountType.REVENUE, nature: AccountNature.CREDIT, parentCode: '42' },
  { code: '429505', name: 'Ajustes de Inventario (Sobrante)', type: AccountType.REVENUE, nature: AccountNature.CREDIT, parentCode: '4295' },

  // ==================== CLASE 5: GASTOS ====================
  { code: '5', name: 'Gastos', type: AccountType.EXPENSE, nature: AccountNature.DEBIT },

  // Grupo 51 - Operacionales de Administracion
  { code: '51', name: 'Operacionales de Administracion', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, parentCode: '5' },
  { code: '5105', name: 'Gastos de Personal', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, parentCode: '51' },
  { code: '5115', name: 'Arrendamientos', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, parentCode: '51' },
  { code: '5120', name: 'Servicios', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, parentCode: '51' },
  { code: '5195', name: 'Diversos', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, parentCode: '51' },
  { code: '519505', name: 'Ajustes de Inventario (Faltante)', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, parentCode: '5195' },

  // Grupo 53 - Gastos No Operacionales
  { code: '53', name: 'No Operacionales', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, parentCode: '5' },
  { code: '5305', name: 'Gastos Financieros', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, parentCode: '53' },

  // ==================== CLASE 6: COSTOS DE VENTA ====================
  { code: '6', name: 'Costos de Venta', type: AccountType.COGS, nature: AccountNature.DEBIT },

  // Grupo 61 - Costo de Ventas y Prestacion de Servicios
  { code: '61', name: 'Costo de Ventas', type: AccountType.COGS, nature: AccountNature.DEBIT, parentCode: '6' },
  { code: '6135', name: 'Comercio al por Mayor y Menor', type: AccountType.COGS, nature: AccountNature.DEBIT, parentCode: '61' },
  { code: '613505', name: 'Costo de Mercancias Vendidas', type: AccountType.COGS, nature: AccountNature.DEBIT, parentCode: '6135' },
];

@Injectable()
export class AccountingSetupService {
  private readonly logger = new Logger(AccountingSetupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async setup(): Promise<{ message: string; accountsCreated: number }> {
    const tenantId = this.tenantContext.requireTenantId();

    // Check if already set up
    const existingAccounts = await this.prisma.account.count({
      where: { tenantId },
    });

    if (existingAccounts > 0) {
      throw new ConflictException(
        'La contabilidad ya esta configurada para este tenant. Ya existen cuentas.',
      );
    }

    this.logger.log(`Setting up accounting for tenant ${tenantId}...`);

    // Create accounts in order (parents first)
    const accountIdMap = new Map<string, string>();

    for (const seed of PUC_ACCOUNTS) {
      const parentId = seed.parentCode ? accountIdMap.get(seed.parentCode) : undefined;
      const level = this.getLevel(seed.code);

      const account = await this.prisma.account.create({
        data: {
          tenantId,
          code: seed.code,
          name: seed.name,
          type: seed.type,
          nature: seed.nature,
          parentId: parentId ?? null,
          level,
          isSystemAccount: true,
          isBankAccount: seed.isBankAccount ?? false,
        },
      });

      accountIdMap.set(seed.code, account.id);
    }

    // Create default accounting config with mapped accounts
    await this.prisma.accountingConfig.create({
      data: {
        tenantId,
        cashAccountId: accountIdMap.get('110505') ?? null,
        bankAccountId: accountIdMap.get('111005') ?? null,
        accountsReceivableId: accountIdMap.get('130505') ?? null,
        inventoryAccountId: accountIdMap.get('143505') ?? null,
        accountsPayableId: accountIdMap.get('220505') ?? null,
        ivaPorPagarId: accountIdMap.get('240805') ?? null,
        ivaDescontableId: accountIdMap.get('241205') ?? null,
        revenueAccountId: accountIdMap.get('413505') ?? null,
        cogsAccountId: accountIdMap.get('613505') ?? null,
        inventoryAdjustmentId: accountIdMap.get('519505') ?? null,
        reteFuenteReceivedId: accountIdMap.get('135515') ?? null,
        reteFuentePayableId: accountIdMap.get('236540') ?? null,
        autoGenerateEntries: false,
      },
    });

    this.logger.log(`Accounting set up: ${PUC_ACCOUNTS.length} accounts created for tenant ${tenantId}`);

    return {
      message: `Contabilidad configurada exitosamente. ${PUC_ACCOUNTS.length} cuentas PUC creadas.`,
      accountsCreated: PUC_ACCOUNTS.length,
    };
  }

  private getLevel(code: string): number {
    if (code.length <= 1) return 1;
    if (code.length <= 2) return 2;
    if (code.length <= 4) return 3;
    return 4;
  }
}
