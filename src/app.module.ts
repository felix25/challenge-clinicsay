import { HealthModule } from './shared/infrastructure/health/health.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './shared/infrastructure/http/filters/http-exception.filter';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { Module } from '@nestjs/common';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ClockModule } from './shared/infrastructure/clock/clock.module';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  imports: [
    HealthModule,
    ClockModule.register(),
    ClinicsModule,
    PatientsModule,
    AppointmentsModule, RemindersModule, WebhooksModule,
  ],
})
export class AppModule {}
