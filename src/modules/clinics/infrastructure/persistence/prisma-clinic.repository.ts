import { Injectable } from '@nestjs/common';
import { Clinic } from '../../domain/clinic.entity';
import { ClinicRepository } from '../../application/ports/clinic.repository';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaClinicRepository extends ClinicRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(clinic: Clinic): Promise<Clinic> {
    const saved = await this.prisma.clinic.create({
      data: {
        id: clinic.id,
        name: clinic.name,
        timezone: clinic.timezone,
      },
    });

    return new Clinic(saved.id, saved.name, saved.timezone);
  }

  async findById(id: string): Promise<Clinic | null> {
    const found = await this.prisma.clinic.findUnique({
      where: { id },
    });

    return found
      ? new Clinic(found.id, found.name, found.timezone)
      : null;
  }
}
