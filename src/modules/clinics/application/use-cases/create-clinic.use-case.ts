import { randomUUID } from 'node:crypto';
import { Clinic } from '../../domain/clinic.entity';
import { ClinicRepository } from '../ports/clinic.repository';

export class CreateClinicUseCase {
  constructor(
    private readonly clinicRepository: ClinicRepository,
  ) {}

  async execute(name: string, timezone: string): Promise<Clinic> {
    const clinic = new Clinic(
      randomUUID(),
      name,
      timezone,
    );

    return this.clinicRepository.save(clinic);
  }
}