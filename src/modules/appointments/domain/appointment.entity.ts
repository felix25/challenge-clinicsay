export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled';

export class Appointment {
  constructor(
    public readonly id: string,
    public readonly clinicId: string,
    public readonly patientId: string,
    public readonly startsAt: Date,
    public readonly status: AppointmentStatus,
  ) {}
}
