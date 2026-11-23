import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Put,
  HttpCode,
} from '@nestjs/common';
import { TestClock } from './test-clock';

@Controller('test/clock')
export class TestClockController {
  constructor(private readonly testClock: TestClock) {}

  @Put()
  @HttpCode(204)
  update(@Body() body: { now?: unknown }): void {
    if (process.env.CLOCK_MODE !== 'test') {
      throw new NotFoundException();
    }

    if (
      !body ||
      typeof body.now !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(body.now)
    ) {
      throw new BadRequestException('Invalid clock date');
    }

    const date = new Date(body.now);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid clock date');
    }

    this.testClock.setNow(date);
  }
}
