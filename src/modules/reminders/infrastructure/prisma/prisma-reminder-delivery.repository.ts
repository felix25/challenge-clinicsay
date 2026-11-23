import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  ClaimedReminder,
  ReminderDeliveryRepository,
} from '../../application/ports/reminder-delivery.repository';

@Injectable()
export class PrismaReminderDeliveryRepository extends ReminderDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async claimNext(now: Date): Promise<ClaimedReminder | null> {
    const claimToken = randomUUID();
    const leaseUntil = new Date(now.getTime() + 30_000);

    const claimed = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Reminder"
      SET "leaseUntil" = ${leaseUntil},
          "claimToken" = ${claimToken}
      WHERE id = (
        SELECT id
        FROM "Reminder"
        WHERE status = 'pending'::"ReminderStatus"
          AND "scheduledFor" <= ${now}
          AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now})
          AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now})
        ORDER BY "scheduledFor", id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING id
    `;

    if (!claimed.length) return null;

    const reminder = await this.prisma.reminder.findUniqueOrThrow({
      where: { id: claimed[0].id },
      include: {
        appointment: {
          include: {
            patient: true,
            clinic: true,
          },
        },
      },
    });

    return {
      id: reminder.id,
      claimToken,
      appointmentId: reminder.appointmentId,
      startsAt: reminder.appointment.startsAt,
      appointmentStatus: reminder.appointment.status,
      patientName: reminder.appointment.patient.name,
      phone: reminder.appointment.patient.phone,
      acceptsReminders: reminder.appointment.patient.acceptsReminders,
      clinicName: reminder.appointment.clinic.name,
      timezone: reminder.appointment.clinic.timezone,
    };
  }

  async complete(
    reminder: ClaimedReminder,
    outcome: 'sent' | 'retry' | 'failed' | 'skipped',
    now: Date,
    skipReason?: 'too_late' | 'no_phone' | 'opted_out',
  ): Promise<void> {
    const current = await this.prisma.reminder.findUnique({
      where: { id: reminder.id },
      select: { attempts: true },
    });

    if (!current) return;

    const isAttempt = outcome !== 'skipped';
    const attempts = current.attempts + (isAttempt ? 1 : 0);
    const finalOutcome =
      outcome === 'retry' && attempts >= 3 ? 'failed' : outcome;

    const nextAttemptAt =
      finalOutcome === 'retry'
        ? new Date(now.getTime() + (attempts === 1 ? 60_000 : 300_000))
        : null;

    await this.prisma.reminder.updateMany({
      where: {
        id: reminder.id,
        claimToken: reminder.claimToken,
        status: 'pending',
      },
      data: {
        status:
          finalOutcome === 'retry'
            ? 'pending'
            : finalOutcome === 'skipped'
              ? 'skipped'
              : finalOutcome,
        attempts,
        sentAt: finalOutcome === 'sent' ? now : null,
        skipReason: finalOutcome === 'skipped' ? skipReason : null,
        nextAttemptAt,
        leaseUntil: null,
        claimToken: null,
      },
    });
  }
}
