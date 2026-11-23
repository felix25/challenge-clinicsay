import { Module } from '@nestjs/common';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { PatientsModule } from './modules/patients/patients.module';

@Module({
  imports: [ClinicsModule, PatientsModule],
})
export class AppModule {}
