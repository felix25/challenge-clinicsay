import { Controller, HttpCode, Post } from '@nestjs/common';
import { RunRemindersUseCase } from '../../application/use-cases/run-reminders.use-case';

@Controller('jobs/reminders')
export class RemindersController {
  constructor(private readonly runReminders: RunRemindersUseCase) {}

  @Post('run')
  @HttpCode(200)
  run() {
    return this.runReminders.execute();
  }
}
