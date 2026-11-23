import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
} from '@nestjs/common';
import { CancelAppointmentUseCase } from '../../application/use-cases/cancel-appointment.use-case';
import { CreateAppointmentUseCase } from '../../application/use-cases/create-appointment.use-case';
import { GetAppointmentUseCase } from '../../application/use-cases/get-appointment.use-case';
import { RescheduleAppointmentUseCase } from '../../application/use-cases/reschedule-appointment.use-case';

interface CreateAppointmentDto {
  clinicId: string;
  patientId: string;
  startsAt: string;
}

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly getAppointment: GetAppointmentUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
  ) {}

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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      throw new BadRequestException('Invalid appointment id');
    }

    return this.getAppointment.execute(id);
  }

  @Patch(':id')
  async reschedule(
    @Param('id') id: string,
    @Body() body: { startsAt?: unknown },
  ) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      throw new BadRequestException('Invalid appointment id');
    }

    if (
      !body ||
      typeof body.startsAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(body.startsAt)
    ) {
      throw new BadRequestException('Invalid appointment date');
    }

    return this.rescheduleAppointment.execute(id, body.startsAt);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      throw new BadRequestException('Invalid appointment id');
    }

    return this.cancelAppointment.execute(id);
  }
}
