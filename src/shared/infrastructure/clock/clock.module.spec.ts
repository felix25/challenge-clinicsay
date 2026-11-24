import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Clock } from '../../application/ports/clock';
import { ClockModule } from './clock.module';
import { SystemClock } from './system-clock';
import { TestClock } from './test-clock';
import { TestClockController } from './test-clock.controller';

describe('ClockModule', () => {
  const originalMode = process.env.CLOCK_MODE;

  let app: INestApplication;

  async function bootstrap(mode?: string) {
    if (mode === undefined) {
      delete process.env.CLOCK_MODE;
    } else {
      process.env.CLOCK_MODE = mode;
    }

    const module = await Test.createTestingModule({
      imports: [ClockModule.register()],
    }).compile();

    app = module.createNestApplication();

    await app.init();
  }

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    if (originalMode === undefined) {
      delete process.env.CLOCK_MODE;
    } else {
      process.env.CLOCK_MODE = originalMode;
    }
  });

  it('uses TestClock and allows changing time in test mode', async () => {
    await bootstrap('test');

    const clock = app.get(Clock);

    expect(clock).toBeInstanceOf(TestClock);

    await request(app.getHttpServer())
      .put('/test/clock')
      .send({ now: '2026-11-23T15:00:00.000Z' })
      .expect(204);

    expect(clock.now().toISOString())
      .toBe('2026-11-23T15:00:00.000Z');
  });

  it.each(['production', 'development', undefined])(
    'uses SystemClock and does not register the test controller in mode %s',
    async (mode) => {
      await bootstrap(mode);

      const clock = app.get(Clock);

      expect(clock).toBeInstanceOf(SystemClock);

      expect(() => app.get(TestClockController)).toThrow();

      await request(app.getHttpServer())
        .put('/test/clock')
        .send({ now: '2020-01-01T00:00:00.000Z' })
        .expect(404);

      expect(Math.abs(clock.now().getTime() - Date.now()))
        .toBeLessThan(1000);
    },
  );

  it('rejects invalid dates in test mode', async () => {
    await bootstrap('test');

    await request(app.getHttpServer())
      .put('/test/clock')
      .send({ now: 'invalid-date' })
      .expect(400);
  });
});
