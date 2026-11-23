import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { CreatePatientUseCase } from '../../application/use-cases/create-patient.use-case';

interface CreatePatientDto {
  clinicId: string;
  name: string;
  phone?: string | null;
  acceptsReminders: boolean;
}

@Controller('patients')
export class PatientsController {
  constructor(private readonly createPatient: CreatePatientUseCase) {}

  @Post()
  async create(@Body() body: CreatePatientDto) {
    if (
      !body ||
      typeof body.clinicId !== 'string' ||
      !body.clinicId.trim() ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      (body.phone !== undefined &&
        body.phone !== null &&
        typeof body.phone !== 'string') ||
      typeof body.acceptsReminders !== 'boolean'
    ) {
      throw new BadRequestException('Invalid patient data');
    }

    return this.createPatient.execute(
      body.clinicId,
      body.name.trim(),
      body.phone ?? null,
      body.acceptsReminders,
    );
  }
}
