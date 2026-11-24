import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Reminders and Webhooks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let clinicId: string;

  const databaseUrl =
    'postgresql://clinicsay:clinicsay@localhost:5434/clinicsay_test';

  const providerUrl = 'http://localhost:4011';

  const now = '2026-11-23T15:00:00.000Z';
  const startsAt = '2026-11-24T15:00:00.000Z';
  const phone = '+51987654321';

  beforeAll(async () => {
    if (
      process.env.DATABASE_URL !== databaseUrl ||
      process.env.PROVIDER_URL !== providerUrl ||
      process.env.CLOCK_MODE !== 'test'
    ) {
      throw new Error(
        'Reminder E2E tests require the isolated test environment',
      );
    }

    prisma = new PrismaClient();
    await prisma.$connect();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.inboundMessage.deleteMany(),
      prisma.reminder.deleteMany(),
      prisma.appointment.deleteMany(),
      prisma.patient.deleteMany(),
      prisma.clinic.deleteMany(),
    ]);

    await request(providerUrl)
      .post('/admin/reset')
      .expect(204);

    await setClock(now);

    const clinic = await request(app.getHttpServer())
      .post('/clinics')
      .send({
        name: 'Clinica E2E',
        timezone: 'America/Lima',
      })
      .expect(201);

    clinicId = clinic.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  async function setClock(date: string) {
    await request(app.getHttpServer())
      .put('/test/clock')
      .send({ now: date })
      .expect(204);
  }

  async function createAppointment(
    patientPhone: string | null = phone,
    acceptsReminders = true,
    appointmentStartsAt = startsAt,
  ) {
    const patient = await request(app.getHttpServer())
      .post('/patients')
      .send({
        clinicId,
        name: 'Ana',
        phone: patientPhone,
        acceptsReminders,
      })
      .expect(201);

    const appointment = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        clinicId,
        patientId: patient.body.id,
        startsAt: appointmentStartsAt,
      })
      .expect(201);

    return appointment.body;
  }

  async function runJob() {
    const response = await request(app.getHttpServer())
      .post('/jobs/reminders/run')
      .expect(200);

    return response.body.processed;
  }

  async function getAppointment(id: string) {
    const response = await request(app.getHttpServer())
      .get(`/appointments/${id}`)
      .expect(200);

    return response.body;
  }

  async function getReminder(id: string) {
    const appointment = await getAppointment(id);
    return appointment.reminders[0];
  }

  async function setRule(
    mode: 'unavailable' | 'lost-response' | 'reject',
    count = 1,
  ) {
    await request(providerUrl)
      .post('/admin/rules')
      .send({ to: phone, mode, count })
      .expect(204);
  }

  async function getRequests() {
    const response = await request(providerUrl)
      .get('/admin/requests')
      .query({ to: phone })
      .expect(200);

    return response.body;
  }

  async function getMessages() {
    const response = await request(providerUrl)
      .get('/admin/messages')
      .query({ to: phone })
      .expect(200);

    return response.body;
  }

  async function sendInbound(
    text: string,
    messageId = randomUUID(),
  ) {
    await request(app.getHttpServer())
      .post('/webhooks/inbound-messages')
      .send({
        messageId,
        from: phone,
        text,
        receivedAt: now,
      })
      .expect(200);

    return messageId;
  }

  it('delivers a reminder successfully with the exact message', async () => {
    const appointment = await createAppointment();

    expect(await runJob()).toBe(1);

    const reminder = await getReminder(appointment.id);

    expect(reminder).toMatchObject({
      status: 'sent',
      attempts: 1,
      sentAt: now,
      skipReason: null,
    });

    const messages = await getMessages();

    expect(messages).toHaveLength(1);

    expect(messages[0]).toMatchObject({
      to: phone,
      idempotencyKey: reminder.id,
      text: 'Hola Ana, te recordamos tu cita en Clinica E2E el 24/11/2026 a las 10:00. Responde SI para confirmar o NO para cancelar.',
    });

    expect(await runJob()).toBe(0);
    expect(await getRequests()).toHaveLength(1);
  });

  it('skips reminders when the patient has no phone', async () => {
    const appointment = await createAppointment(null);

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'skipped',
      attempts: 0,
      sentAt: null,
      skipReason: 'no_phone',
    });

    expect(await getRequests()).toHaveLength(0);
  });

  it('skips reminders when the patient opted out', async () => {
    const appointment = await createAppointment(phone, false);

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'skipped',
      attempts: 0,
      skipReason: 'opted_out',
    });

    expect(await getRequests()).toHaveLength(0);
  });

  it('skips reminders when the appointment has started', async () => {
    const appointment = await createAppointment();

    await setClock(startsAt);

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'skipped',
      attempts: 0,
      skipReason: 'too_late',
    });

    expect(await getRequests()).toHaveLength(0);
  });

  it('retries a temporary 503 failure after one minute', async () => {
    const appointment = await createAppointment();

    await setRule('unavailable');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'pending',
      attempts: 1,
      sentAt: null,
    });

    await setClock('2026-11-23T15:00:59.000Z');

    expect(await runJob()).toBe(0);

    await setClock('2026-11-23T15:01:00.000Z');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'sent',
      attempts: 2,
      sentAt: '2026-11-23T15:01:00.000Z',
    });

    const requests = await getRequests();

    expect(requests.map((r: any) => r.status))
      .toEqual([503, 202]);

    expect(requests[0].idempotencyKey)
      .toBe(requests[1].idempotencyKey);

    expect(await getMessages()).toHaveLength(1);
  });

  it('fails permanently after three temporary failures', async () => {
    const appointment = await createAppointment();

    await setRule('unavailable', 3);

    expect(await runJob()).toBe(1);

    await setClock('2026-11-23T15:01:00.000Z');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'pending',
      attempts: 2,
    });

    await setClock('2026-11-23T15:05:59.000Z');

    expect(await runJob()).toBe(0);

    await setClock('2026-11-23T15:06:00.000Z');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'failed',
      attempts: 3,
      sentAt: null,
    });

    await setClock('2026-11-23T15:30:00.000Z');

    expect(await runJob()).toBe(0);

    const requests = await getRequests();

    expect(requests.map((r: any) => r.status))
      .toEqual([503, 503, 503]);

    expect(new Set(
      requests.map((r: any) => r.idempotencyKey),
    ).size).toBe(1);

    expect(await getMessages()).toHaveLength(0);
  });

  it('does not retry a permanent 422 rejection', async () => {
    const appointment = await createAppointment();

    await setRule('reject');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'failed',
      attempts: 1,
      sentAt: null,
    });

    await setClock('2026-11-23T15:30:00.000Z');

    expect(await runJob()).toBe(0);

    const requests = await getRequests();

    expect(requests.map((r: any) => r.status)).toEqual([422]);

    expect(await getMessages()).toHaveLength(0);
  });

  it('handles lost responses without delivering duplicates', async () => {
    const appointment = await createAppointment();

    await setRule('lost-response');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'pending',
      attempts: 1,
      sentAt: null,
    });

    expect(await getMessages()).toHaveLength(1);

    await setClock('2026-11-23T15:01:00.000Z');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'sent',
      attempts: 2,
    });

    const requests = await getRequests();

    expect(requests.map((r: any) => r.status))
      .toEqual([504, 200]);

    expect(requests[0].idempotencyKey)
      .toBe(requests[1].idempotencyKey);

    expect(await getMessages()).toHaveLength(1);
  });

  it('prevents duplicate sends when jobs run concurrently', async () => {
    const appointment = await createAppointment();

    const results = await Promise.all([
      runJob(),
      runJob(),
      runJob(),
    ]);

    expect(results.reduce((sum, value) => sum + value, 0))
      .toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'sent',
      attempts: 1,
    });

    expect(await getRequests()).toHaveLength(1);
    expect(await getMessages()).toHaveLength(1);
  });

  it('confirms an appointment through an inbound SI message', async () => {
    const appointment = await createAppointment();

    await runJob();
    await sendInbound('  sí  ');

    expect(await getAppointment(appointment.id)).toMatchObject({
      status: 'confirmed',
    });
  });

  it('cancels an appointment through an inbound NO message', async () => {
    const appointment = await createAppointment();

    await runJob();
    await sendInbound('NO');

    expect(await getAppointment(appointment.id)).toMatchObject({
      status: 'cancelled',
    });

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'sent',
      attempts: 1,
    });
  });

  it('deduplicates inbound messages by messageId', async () => {
    const appointment = await createAppointment();

    await runJob();

    const messageId = await sendInbound('SI');

    await sendInbound('NO', messageId);

    expect(await getAppointment(appointment.id)).toMatchObject({
      status: 'confirmed',
    });

    expect(await prisma.inboundMessage.count({
      where: { messageId },
    })).toBe(1);
  });

  it('ignores unrecognized inbound messages', async () => {
    const appointment = await createAppointment();

    await runJob();
    await sendInbound('Gracias');

    expect(await getAppointment(appointment.id)).toMatchObject({
      status: 'scheduled',
    });
  });

  it('ignores inbound confirmations without a sent reminder', async () => {
    const appointment = await createAppointment();

    await sendInbound('SI');

    expect(await getAppointment(appointment.id)).toMatchObject({
      status: 'scheduled',
    });
  });

  it('does not send reminders for cancelled appointments', async () => {
    const appointment = await createAppointment();

    await request(app.getHttpServer())
      .post(`/appointments/${appointment.id}/cancel`)
      .expect(200);

    expect(await runJob()).toBe(0);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'cancelled',
      attempts: 0,
    });

    expect(await getRequests()).toHaveLength(0);
  });

  it('confirms only the latest appointment for a shared phone', async () => {
    const first = await createAppointment();

    expect(await runJob()).toBe(1);

    const second = await createAppointment(
      phone,
      true,
      '2026-11-24T16:00:00.000Z',
    );

    await setClock('2026-11-23T16:00:00.000Z');

    expect(await runJob()).toBe(1);

    await sendInbound('SI');

    expect(await getAppointment(first.id)).toMatchObject({
      status: 'scheduled',
    });

    expect(await getAppointment(second.id)).toMatchObject({
      status: 'confirmed',
    });
  });

  it('ignores cancelled appointments when selecting the latest reminder', async () => {
    const first = await createAppointment();

    expect(await runJob()).toBe(1);

    const second = await createAppointment(
      phone,
      true,
      '2026-11-24T16:00:00.000Z',
    );

    await setClock('2026-11-23T16:00:00.000Z');

    expect(await runJob()).toBe(1);

    await request(app.getHttpServer())
      .post(`/appointments/${second.id}/cancel`)
      .expect(200);

    await sendInbound('SI');

    expect(await getAppointment(first.id)).toMatchObject({
      status: 'confirmed',
    });

    expect(await getAppointment(second.id)).toMatchObject({
      status: 'cancelled',
    });
  });

  it('ignores inbound responses when the appointment has started', async () => {
    const appointment = await createAppointment();

    expect(await runJob()).toBe(1);

    await setClock(startsAt);

    await sendInbound('SI');

    expect(await getAppointment(appointment.id)).toMatchObject({
      status: 'scheduled',
    });
  });

  it('deduplicates concurrent inbound messages without HTTP errors', async () => {
    const appointment = await createAppointment();

    expect(await runJob()).toBe(1);

    const messageId = randomUUID();

    await Promise.all([
      sendInbound('SI', messageId),
      sendInbound('SI', messageId),
      sendInbound('SI', messageId),
    ]);

    expect(await prisma.inboundMessage.count({
      where: { messageId },
    })).toBe(1);

    expect(await getAppointment(appointment.id)).toMatchObject({
      status: 'confirmed',
    });
  });


  it('persists a skipped reminder when creation is too late', async () => {
    await setClock('2026-11-23T12:00:00.000Z');

    const appointment = await createAppointment(
      phone,
      true,
      '2026-11-23T13:00:00.000Z',
    );

    const expected = {
      status: 'skipped',
      skipReason: 'too_late',
      attempts: 0,
      sentAt: null,
      scheduledFor: '2026-11-23T14:00:00.000Z',
    };

    expect(appointment.reminders[0]).toMatchObject(expected);
    expect(await getReminder(appointment.id)).toMatchObject(expected);

    await setClock('2026-11-23T14:00:00.000Z');

    expect(await runJob()).toBe(0);
    expect(await getRequests()).toHaveLength(0);
  });

  it('persists a skipped reminder when rescheduling is too late', async () => {
    await setClock('2026-11-23T12:00:00.000Z');

    const appointment = await createAppointment();

    const response = await request(app.getHttpServer())
      .patch(`/appointments/${appointment.id}`)
      .send({
        startsAt: '2026-11-23T14:00:00.000Z',
      })
      .expect(200);

    const expected = {
      status: 'skipped',
      skipReason: 'too_late',
      attempts: 0,
      sentAt: null,
      scheduledFor: '2026-11-23T14:00:00.000Z',
    };

    expect(response.body.reminders).toHaveLength(2);

    expect(response.body.reminders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: appointment.reminders[0].id,
          status: 'cancelled',
        }),
        expect.objectContaining(expected),
      ]),
    );

    const persisted = await getAppointment(appointment.id);

    expect(persisted.reminders).toHaveLength(2);
    expect(persisted.reminders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: appointment.reminders[0].id,
          status: 'cancelled',
        }),
        expect.objectContaining(expected),
      ]),
    );

    await setClock('2026-11-23T15:00:00.000Z');

    expect(await runJob()).toBe(0);
    expect(await getRequests()).toHaveLength(0);
  });


  it('retries temporary failures during quiet hours', async () => {
    await setClock('2026-11-24T01:59:00.000Z');

    const appointment = await createAppointment(
      phone,
      true,
      '2026-11-25T01:59:00.000Z',
    );

    await setRule('unavailable', 2);

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'pending',
      attempts: 1,
    });

    await setClock('2026-11-24T02:00:00.000Z');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'pending',
      attempts: 2,
    });

    await setClock('2026-11-24T02:04:59.000Z');

    expect(await runJob()).toBe(0);

    await setClock('2026-11-24T02:05:00.000Z');

    expect(await runJob()).toBe(1);

    expect(await getReminder(appointment.id)).toMatchObject({
      status: 'sent',
      attempts: 3,
      sentAt: '2026-11-24T02:05:00.000Z',
    });

    const requests = await getRequests();

    expect(requests.map((r: any) => r.status))
      .toEqual([503, 503, 202]);

    expect(new Set(
      requests.map((r: any) => r.idempotencyKey),
    ).size).toBe(1);

    expect(await getMessages()).toHaveLength(1);
  });

});
