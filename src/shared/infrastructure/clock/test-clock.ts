import { Injectable } from '@nestjs/common';
import { Clock } from '../../application/ports/clock';

@Injectable()
export class TestClock extends Clock {
  private currentTime: Date = new Date();

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  setNow(value: Date): void {
    this.currentTime = new Date(value.getTime());
  }
}
