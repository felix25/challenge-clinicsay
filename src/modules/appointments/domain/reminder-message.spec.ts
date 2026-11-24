import { buildReminderMessage } from './reminder-message';

describe('buildReminderMessage', () => {
  it('builds the exact required message using clinic local time', () => {
    const result = buildReminderMessage({
      patientName: 'Ana',
      clinicName: 'Clinica Central',
      startsAt: new Date('2026-11-24T15:20:00Z'),
      timezone: 'America/Lima',
    });

    expect(result).toBe(
      'Hola Ana, te recordamos tu cita en Clinica Central el 24/11/2026 a las 10:20. Responde SI para confirmar o NO para cancelar.',
    );
  });

  it('uses the local calendar date when UTC crosses midnight', () => {
    const result = buildReminderMessage({
      patientName: 'Ana',
      clinicName: 'Clinica Central',
      startsAt: new Date('2026-11-25T01:00:00Z'),
      timezone: 'America/Lima',
    });

    expect(result).toContain('24/11/2026 a las 20:00');
  });

  it('rejects invalid appointment dates', () => {
    expect(() =>
      buildReminderMessage({
        patientName: 'Ana',
        clinicName: 'Clinica Central',
        startsAt: new Date('invalid'),
        timezone: 'America/Lima',
      }),
    ).toThrow();
  });
});
