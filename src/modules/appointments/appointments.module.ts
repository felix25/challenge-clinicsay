import { CancelAppointmentUseCase } from './application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from './application/use-cases/reschedule-appointment.use-case';
import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { ClinicRepository } from '../clinics/application/ports/clinic.repository';
import { PrismaClinicRepository } from '../clinics/infrastructure/persistence/prisma-clinic.repository';
import { PatientRepository } from '../patients/application/ports/patient.repository';
import { PrismaPatientRepository } from '../patients/infrastructure/persistence/prisma-patient.repository';
import { AppointmentRepository } from './application/ports/appointment.repository';
import { CreateAppointmentUseCase } from './application/use-cases/create-appointment.use-case';
import { GetAppointmentUseCase } from './application/use-cases/get-appointment.use-case';
import { AppointmentsController } from './infrastructure/http/appointments.controller';
import { PrismaAppointmentRepository } from './infrastructure/persistence/prisma-appointment.repository';

@Module({
  controllers: [AppointmentsController],
  providers: [
    PrismaService,
    CreateAppointmentUseCase,
    GetAppointmentUseCase,
    CancelAppointmentUseCase,
    RescheduleAppointmentUseCase,
    {
      provide: AppointmentRepository,
      useClass: PrismaAppointmentRepository,
    },
    {
      provide: ClinicRepository,
      useClass: PrismaClinicRepository,
    },
    {
      provide: PatientRepository,
      useClass: PrismaPatientRepository,
    },
  ],
})
export class AppointmentsModule {}
