import { DateTime } from 'luxon';

export interface ReminderMessageData {
  patientName: string;
  clinicName: string;
  startsAt: Date;
  timezone: string;
}

export function buildReminderMessage(data: ReminderMessageData): string {
  const localDate = DateTime.fromJSDate(data.startsAt, {
    zone: data.timezone,
  });

  if (!localDate.isValid) {
    throw new Error('Invalid appointment date or timezone');
  }

  const date = localDate.toFormat('dd/MM/yyyy');
  const time = localDate.toFormat('HH:mm');

  return `Hola ${data.patientName}, te recordamos tu cita en ${data.clinicName} el ${date} a las ${time}. Responde SI para confirmar o NO para cancelar.`;
}
