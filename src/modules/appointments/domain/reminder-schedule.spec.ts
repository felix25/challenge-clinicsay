import { calculateReminderSchedule } from './reminder-schedule';

describe('calculateReminderSchedule', () => {
  const now = new Date('2026-11-20T12:00:00Z');

  it.each([
    [
      'schedules one calendar day before',
      '2026-11-24T15:00:00Z',
      '2026-11-23T15:00:00.000Z',
    ],
    [
      'moves early morning reminders to 09:00',
      '2026-11-24T12:00:00Z',
      '2026-11-23T14:00:00.000Z',
    ],
    [
      'moves evening reminders to the next day at 09:00',
      '2026-11-25T03:00:00Z',
      '2026-11-24T14:00:00.000Z',
    ],
    [
      'allows reminders exactly at 09:00',
      '2026-11-24T14:00:00Z',
      '2026-11-23T14:00:00.000Z',
    ],
    [
      'blocks reminders exactly at 21:00',
      '2026-11-25T02:00:00Z',
      '2026-11-24T14:00:00.000Z',
    ],
  ])('%s', (_name, startsAt, expected) => {
    const result = calculateReminderSchedule(
      new Date(startsAt),
      'America/Lima',
      now,
    );

    expect(result.toISOString()).toBe(expected);
  });

  it('schedules immediately when the original time has passed', () => {
    const current = new Date('2026-11-24T15:00:00Z');

    const result = calculateReminderSchedule(
      new Date('2026-11-24T18:00:00Z'),
      'America/Lima',
      current,
    );

    expect(result.toISOString()).toBe(current.toISOString());
  });

  it('applies quiet hours when the original time has passed', () => {
    const result = calculateReminderSchedule(
      new Date('2026-11-24T18:00:00Z'),
      'America/Lima',
      new Date('2026-11-24T11:00:00Z'),
    );

    expect(result.toISOString()).toBe(
      '2026-11-24T14:00:00.000Z',
    );
  });

  it('preserves local time across spring DST changes', () => {
    const result = calculateReminderSchedule(
      new Date('2027-03-28T08:00:00Z'),
      'Europe/Madrid',
      new Date('2027-03-25T12:00:00Z'),
    );

    expect(result.toISOString()).toBe(
      '2027-03-27T09:00:00.000Z',
    );
  });

  it('preserves local time across autumn DST changes', () => {
    const result = calculateReminderSchedule(
      new Date('2027-10-31T09:00:00Z'),
      'Europe/Madrid',
      new Date('2027-10-28T12:00:00Z'),
    );

    expect(result.toISOString()).toBe(
      '2027-10-30T08:00:00.000Z',
    );
  });

  it('rejects invalid timezones', () => {
    expect(() =>
      calculateReminderSchedule(
        new Date('2026-11-24T15:00:00Z'),
        'Invalid/Timezone',
        now,
      ),
    ).toThrow();
  });
});
