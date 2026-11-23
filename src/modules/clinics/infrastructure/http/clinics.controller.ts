import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CreateClinicUseCase } from '../../application/use-cases/create-clinic.use-case';

interface CreateClinicDto {
  name: string;
  timezone: string;
}

@Controller('clinics')
export class ClinicsController {
  constructor(private readonly createClinic: CreateClinicUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateClinicDto) {
    if (
      !body ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      typeof body.timezone !== 'string'
    ) {
      throw new BadRequestException('Invalid clinic data');
    }

    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: body.timezone,
      });
    } catch {
      throw new BadRequestException('Invalid timezone');
    }

    return this.createClinic.execute(body.name.trim(), body.timezone);
  }
}
