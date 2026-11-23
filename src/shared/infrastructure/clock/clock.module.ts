import { Global, Module } from '@nestjs/common';
import { Clock } from '../../application/ports/clock';
import { SystemClock } from './system-clock';
import { TestClock } from './test-clock';
import { TestClockController } from './test-clock.controller';

@Global()
@Module({
  controllers: [TestClockController],
  providers: [
    TestClock,
    SystemClock,
    {
      provide: Clock,
      useFactory: (testClock: TestClock, systemClock: SystemClock) => {
        return process.env.CLOCK_MODE === 'test'
          ? testClock
          : systemClock;
      },
      inject: [TestClock, SystemClock],
    },
  ],
  exports: [Clock],
})
export class ClockModule {}
