import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { PatientRepository } from '../../application/ports/patient.repository';
import { Patient } from '../../domain/patient.entity';

@Injectable()
export class PrismaPatientRepository extends PatientRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(patient: Patient): Promise<Patient> {
    const saved = await this.prisma.patient.create({
      data: {
        id: patient.id,
        clinicId: patient.clinicId,
        name: patient.name,
        phone: patient.phone,
        acceptsReminders: patient.acceptsReminders,
      },
    });

    return new Patient(
      saved.id,
      saved.clinicId,
      saved.name,
      saved.phone,
      saved.acceptsReminders,
    );
  }

  async findById(id: string): Promise<Patient | null> {
    const found = await this.prisma.patient.findUnique({
      where: { id },
    });

    return found
      ? new Patient(
          found.id,
          found.clinicId,
          found.name,
          found.phone,
          found.acceptsReminders,
        )
      : null;
  }
}
