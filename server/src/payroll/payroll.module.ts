import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { DianModule } from '../dian/dian.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PayrollConfigController } from './payroll-config.controller';
import { PayrollConfigService } from './payroll-config.service';
import { PayrollPeriodsController } from './payroll-periods.controller';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollEntriesController } from './payroll-entries.controller';
import { PayrollEntriesService } from './payroll-entries.service';
import { PayrollBenefitsController } from './payroll-benefits.controller';
import { PayrollReportsController } from './payroll-reports.controller';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollBenefitsService } from './services/payroll-benefits.service';
import { PayrollCuneGeneratorService } from './services/payroll-cune-generator.service';
import { PayrollXmlGeneratorService } from './services/payroll-xml-generator.service';
import { PayrollDianService } from './services/payroll-dian.service';
import { PayrollReportsService } from './services/payroll-reports.service';

@Module({
  imports: [AccountingModule, DianModule],
  controllers: [
    EmployeesController,
    PayrollConfigController,
    PayrollPeriodsController,
    PayrollEntriesController,
    PayrollBenefitsController,
    PayrollReportsController,
  ],
  providers: [
    EmployeesService,
    PayrollConfigService,
    PayrollPeriodsService,
    PayrollEntriesService,
    PayrollCalculationService,
    PayrollBenefitsService,
    PayrollCuneGeneratorService,
    PayrollXmlGeneratorService,
    PayrollDianService,
    PayrollReportsService,
  ],
  exports: [
    EmployeesService,
    PayrollConfigService,
    PayrollPeriodsService,
    PayrollEntriesService,
    PayrollCalculationService,
    PayrollBenefitsService,
    PayrollDianService,
    PayrollReportsService,
  ],
})
export class PayrollModule {}
