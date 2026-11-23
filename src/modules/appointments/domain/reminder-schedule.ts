import { DateTime } from 'luxon';

export function calculateReminderSchedule(
  startsAt: Date,
  timezone: string,
  now: Date,
): Date {
  const appointmentLocal = DateTime.fromJSDate(startsAt, {
    zone: timezone,
  });

  if (!appointmentLocal.isValid) {
    throw new Error('Invalid appointment date or timezone');
  }

  let reminderLocal: DateTime = appointmentLocal.minus({ days: 1 });

  const currentLocal = DateTime.fromJSDate(now, {
    zone: timezone,
  });

  if (!currentLocal.isValid) {
    throw new Error('Invalid current date or timezone');
  }

  if (reminderLocal.toMillis() < currentLocal.toMillis()) {
    reminderLocal = currentLocal;
  }

  // Horario de silencio: 21:00 a 09:00.
  if (reminderLocal.hour >= 21) {
    reminderLocal = reminderLocal
      .plus({ days: 1 })
      .startOf('day')
      .set({ hour: 9 });
  } else if (reminderLocal.hour < 9) {
    reminderLocal = reminderLocal
      .startOf('day')
      .set({ hour: 9 });
  }

  return reminderLocal.toUTC().toJSDate();
}
