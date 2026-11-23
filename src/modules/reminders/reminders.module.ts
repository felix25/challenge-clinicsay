import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { MessageProvider } from './application/ports/message-provider';
import { ReminderDeliveryRepository } from './application/ports/reminder-delivery.repository';
import { RunRemindersUseCase } from './application/use-cases/run-reminders.use-case';
import { RemindersController } from './infrastructure/http/reminders.controller';
import { HttpMessageProvider } from './infrastructure/provider/http-message-provider';
import { PrismaReminderDeliveryRepository } from './infrastructure/prisma/prisma-reminder-delivery.repository';

@Module({
  controllers: [RemindersController],
  providers: [
    PrismaService,
    RunRemindersUseCase,
    {
      provide: MessageProvider,
      useClass: HttpMessageProvider,
    },
    {
      provide: ReminderDeliveryRepository,
      useClass: PrismaReminderDeliveryRepository,
    },
  ],
})
export class RemindersModule {}
