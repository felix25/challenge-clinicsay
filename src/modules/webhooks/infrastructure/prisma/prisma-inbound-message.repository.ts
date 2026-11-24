import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  InboundDecision,
  InboundMessage,
  InboundMessageRepository,
} from '../../application/ports/inbound-message.repository';

@Injectable()
export class PrismaInboundMessageRepository extends InboundMessageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(
    message: InboundMessage,
    decision: InboundDecision,
    now: Date,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          // La PK messageId impide procesar dos veces el mismo evento.
          await tx.inboundMessage.create({
            data: {
              messageId: message.messageId,
              from: message.from,
              text: message.text,
              receivedAt: message.receivedAt,
            },
          });

          if (decision === 'ignore') {
            return;
          }

          // Solo se consideran citas futuras con un recordatorio enviado.
          const reminder = await tx.reminder.findFirst({
            where: {
              status: 'sent',
              sentAt: { not: null },
              appointment: {
                startsAt: { gt: now },
                status: { not: 'cancelled' },
                patient: { phone: message.from },
              },
            },
            orderBy: [
              { sentAt: 'desc' },
              { id: 'desc' },
            ],
            select: {
              appointmentId: true,
            },
          });

          if (!reminder) {
            return;
          }

          if (decision === 'confirm') {
            await tx.appointment.updateMany({
              where: {
                id: reminder.appointmentId,
                status: 'scheduled',
                startsAt: { gt: now },
              },
              data: { status: 'confirmed' },
            });

            return;
          }

          const cancelled = await tx.appointment.updateMany({
            where: {
              id: reminder.appointmentId,
              status: { not: 'cancelled' },
              startsAt: { gt: now },
            },
            data: { status: 'cancelled' },
          });

          if (cancelled.count > 0) {
            await tx.reminder.updateMany({
              where: {
                appointmentId: reminder.appointmentId,
                status: 'pending',
              },
              data: {
                status: 'cancelled',
                leaseUntil: null,
                claimToken: null,
                nextAttemptAt: null,
              },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // Una repetición del mismo messageId no debe causar un error HTTP.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }

      throw error;
    }
  }
}
