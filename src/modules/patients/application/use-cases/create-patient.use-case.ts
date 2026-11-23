import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ClinicRepository } from '../../../clinics/application/ports/clinic.repository';
import { Patient } from '../../domain/patient.entity';
import { PatientRepository } from '../ports/patient.repository';

@Injectable()
export class CreatePatientUseCase {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly clinicRepository: ClinicRepository,
  ) {}

  async execute(
    clinicId: string,
    name: string,
    phone: string | null,
    acceptsReminders: boolean,
  ): Promise<Patient> {
    const clinic = await this.clinicRepository.findById(clinicId);

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const patient = new Patient(
      randomUUID(),
      clinicId,
      name,
      phone,
      acceptsReminders,
    );

    return this.patientRepository.save(patient);
  }
}
