import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CreatePatientUseCase } from './create-patient.use-case';
import { PatientRepository } from '../ports/patient.repository';
import { ClinicRepository } from '../../../clinics/application/ports/clinic.repository';
import { Clinic } from '../../../clinics/domain/clinic.entity';

describe('CreatePatientUseCase', () => {
  let patients: jest.Mocked<PatientRepository>;
  let clinics: jest.Mocked<ClinicRepository>;
  let useCase: CreatePatientUseCase;

  beforeEach(() => {
    patients = {
      save: jest.fn<PatientRepository['save']>()
        .mockImplementation(async (patient) => patient),
      findById: jest.fn<PatientRepository['findById']>(),
    };

    clinics = {
      save: jest.fn<ClinicRepository['save']>(),
      findById: jest.fn<ClinicRepository['findById']>()
        .mockResolvedValue(
          new Clinic('clinic-1', 'Central', 'America/Lima'),
        ),
    };

    useCase = new CreatePatientUseCase(patients, clinics);
  });

  it('creates a patient with a phone number', async () => {
    const result = await useCase.execute(
      'clinic-1',
      'Ana',
      '+51999999999',
      true,
    );

    expect(result).toMatchObject({
      clinicId: 'clinic-1',
      name: 'Ana',
      phone: '+51999999999',
      acceptsReminders: true,
    });

    expect(patients.save).toHaveBeenCalledWith(result);
  });

  it('allows a patient without a phone number', async () => {
    const result = await useCase.execute(
      'clinic-1', 'Ana', null, true,
    );

    expect(result.phone).toBeNull();
  });

  it('preserves the patient reminder preference', async () => {
    const result = await useCase.execute(
      'clinic-1', 'Ana', '+51999999999', false,
    );

    expect(result.acceptsReminders).toBe(false);
  });

  it('rejects a nonexistent clinic', async () => {
    clinics.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', 'Ana', null, true),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(patients.save).not.toHaveBeenCalled();
  });
});
