export class Patient {
  constructor(
    public readonly id: string,
    public readonly clinicId: string,
    public readonly name: string,
    public readonly phone: string | null,
    public readonly acceptsReminders: boolean,
  ) {}
}
