import { jest } from '@jest/globals';
import { CreateClinicUseCase } from './create-clinic.use-case';
import { ClinicRepository } from '../ports/clinic.repository';

describe('CreateClinicUseCase', () => {
  it('creates and persists a clinic', async () => {
    const repository: jest.Mocked<ClinicRepository> = {
      save: jest.fn<ClinicRepository['save']>()
        .mockImplementation(async (clinic) => clinic),
      findById: jest.fn<ClinicRepository['findById']>(),
    };

    const useCase = new CreateClinicUseCase(repository);

    const result = await useCase.execute(
      'Clinica Central',
      'America/Lima',
    );

    expect(result.id).toBeTruthy();
    expect(result.name).toBe('Clinica Central');
    expect(result.timezone).toBe('America/Lima');
    expect(repository.save).toHaveBeenCalledWith(result);
  });
});
