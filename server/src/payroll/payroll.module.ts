import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PayrollConfigController } from './payroll-config.controller';
import { PayrollConfigService } from './payroll-config.service';
import { PayrollPeriodsController } from './payroll-periods.controller';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollEntriesController } from './payroll-entries.controller';
import { PayrollEntriesService } from './payroll-entries.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollCuneGeneratorService } from './services/payroll-cune-generator.service';
import { PayrollXmlGeneratorService } from './services/payroll-xml-generator.service';
import { PayrollDianService } from './services/payroll-dian.service';

@Module({
  controllers: [
    EmployeesController,
    PayrollConfigController,
    PayrollPeriodsController,
    PayrollEntriesController,
  ],
  providers: [
    EmployeesService,
    PayrollConfigService,
    PayrollPeriodsService,
    PayrollEntriesService,
    PayrollCalculationService,
    PayrollCuneGeneratorService,
    PayrollXmlGeneratorService,
    PayrollDianService,
  ],
  exports: [
    EmployeesService,
    PayrollConfigService,
    PayrollPeriodsService,
    PayrollEntriesService,
    PayrollCalculationService,
    PayrollDianService,
  ],
})
export class PayrollModule {}
