import { Module } from '@nestjs/common';
import { ClinicRepository } from './application/ports/clinic.repository';
import { CreateClinicUseCase } from './application/use-cases/create-clinic.use-case';
import { ClinicsController } from './infrastructure/http/clinics.controller';
import { PrismaClinicRepository } from './infrastructure/persistence/prisma-clinic.repository';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';

@Module({
  controllers: [ClinicsController],
  providers: [
    PrismaService,
    CreateClinicUseCase,
    {
      provide: ClinicRepository,
      useClass: PrismaClinicRepository,
    },
  ],
})
export class ClinicsModule {}
