import { Patient } from '../../domain/patient.entity';

export abstract class PatientRepository {
  abstract save(patient: Patient): Promise<Patient>;
  abstract findById(id: string): Promise<Patient | null>;
}
