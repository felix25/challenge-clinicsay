import { Module } from '@nestjs/common';
import { ClinicRepository } from '../clinics/application/ports/clinic.repository';
import { PrismaClinicRepository } from '../clinics/infrastructure/persistence/prisma-clinic.repository';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { PatientRepository } from './application/ports/patient.repository';
import { CreatePatientUseCase } from './application/use-cases/create-patient.use-case';
import { PatientsController } from './infrastructure/http/patients.controller';
import { PrismaPatientRepository } from './infrastructure/persistence/prisma-patient.repository';

@Module({
  controllers: [PatientsController],
  providers: [
    PrismaService,
    CreatePatientUseCase,
    {
      provide: PatientRepository,
      useClass: PrismaPatientRepository,
    },
    {
      provide: ClinicRepository,
      useClass: PrismaClinicRepository,
    },
  ],
})
export class PatientsModule {}
