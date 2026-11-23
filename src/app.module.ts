import { Module } from '@nestjs/common';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';

@Module({
  imports: [ClinicsModule, PatientsModule, AppointmentsModule],
})
export class AppModule {}
