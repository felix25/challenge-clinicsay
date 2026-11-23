import { Clinic } from '../../domain/clinic.entity';

export abstract class ClinicRepository {
  abstract save(clinic: Clinic): Promise<Clinic>;

  abstract findById(id: string): Promise<Clinic | null>;
}