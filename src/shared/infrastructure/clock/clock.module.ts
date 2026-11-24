import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { Clock } from '../../application/ports/clock';
import { SystemClock } from './system-clock';
import { TestClock } from './test-clock';
import { TestClockController } from './test-clock.controller';

@Global()
@Module({})
export class ClockModule {
  static register(): DynamicModule {
    const isTestMode = process.env.CLOCK_MODE === 'test';

    return {
      module: ClockModule,
      controllers: isTestMode ? [TestClockController] : [],
      providers: isTestMode
        ? [
            TestClock,
            {
              provide: Clock,
              useExisting: TestClock,
            },
          ]
        : [
            {
              provide: Clock,
              useClass: SystemClock,
            },
          ],
      exports: [Clock],
    };
  }
}
