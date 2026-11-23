import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { CreateAppointmentUseCase } from '../../application/use-cases/create-appointment.use-case';

interface CreateAppointmentDto {
  clinicId: string;
  patientId: string;
  startsAt: string;
}

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly createAppointment: CreateAppointmentUseCase) {}

  @Post()
  async create(@Body() body: CreateAppointmentDto) {
    if (
      !body ||
      typeof body.clinicId !== 'string' ||
      !body.clinicId.trim() ||
      typeof body.patientId !== 'string' ||
      !body.patientId.trim() ||
      typeof body.startsAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(body.startsAt)
    ) {
      throw new BadRequestException('Invalid appointment data');
    }

    return this.createAppointment.execute(
      body.clinicId,
      body.patientId,
      body.startsAt,
    );
  }
}
