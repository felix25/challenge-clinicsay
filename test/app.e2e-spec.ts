import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ClinicSay API (e2e)', () => {
  let app: INestApplication;
  let clinicId: string;
  let patientId: string;

  const now = '2026-11-23T15:00:00Z';
  const startsAt = '2026-11-25T15:00:00Z';

  beforeAll(async () => {
    process.env.CLOCK_MODE = 'test';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .put('/test/clock')
      .send({ now })
      .expect(204);

    const clinic = await request(app.getHttpServer())
      .post('/clinics')
      .send({
        name: `Clinic E2E ${randomUUID()}`,
        timezone: 'America/Lima',
      })
      .expect(201);

    clinicId = clinic.body.id;

    const patient = await request(app.getHttpServer())
      .post('/patients')
      .send({
        clinicId,
        name: 'Paciente E2E',
        phone: null,
        acceptsReminders: true,
      })
      .expect(201);

    patientId = patient.body.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createAppointment(date = startsAt) {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        clinicId,
        patientId,
        startsAt: date,
      })
      .expect(201);

    return response.body;
  }

  it('GET /health returns service readiness', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /clinics creates a clinic', async () => {
    const response = await request(app.getHttpServer())
      .post('/clinics')
      .send({
        name: 'Clinica de prueba',
        timezone: 'America/Lima',
      })
      .expect(201);

    expect(response.body.id).toBeTruthy();
    expect(response.body.timezone).toBe('America/Lima');
  });

  it('POST /clinics rejects invalid timezone', async () => {
    const response = await request(app.getHttpServer())
      .post('/clinics')
      .send({
        name: 'Invalid clinic',
        timezone: 'Invalid/Timezone',
      })
      .expect(400);

    expect(typeof response.body.error).toBe('string');
  });

  it('POST /patients creates a patient', async () => {
    const response = await request(app.getHttpServer())
      .post('/patients')
      .send({
        clinicId,
        name: 'Ana',
        phone: '+51999999999',
        acceptsReminders: false,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      clinicId,
      name: 'Ana',
      phone: '+51999999999',
      acceptsReminders: false,
    });
  });

  it('POST /patients rejects nonexistent clinic', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .send({
        clinicId: randomUUID(),
        name: 'Ana',
        phone: null,
        acceptsReminders: true,
      })
      .expect(404);
  });

  it('POST /appointments creates a pending reminder', async () => {
    const appointment = await createAppointment();

    expect(appointment.status).toBe('scheduled');
    expect(appointment.reminders).toHaveLength(1);

    expect(appointment.reminders[0]).toMatchObject({
      scheduledFor: '2026-11-24T15:00:00.000Z',
      status: 'pending',
      attempts: 0,
      sentAt: null,
      skipReason: null,
    });
  });

  it('GET /appointments/:id returns persisted data', async () => {
    const appointment = await createAppointment();

    const response = await request(app.getHttpServer())
      .get(`/appointments/${appointment.id}`)
      .expect(200);

    expect(response.body).toEqual(appointment);
  });

  it('GET /appointments/:id returns 404 when missing', async () => {
    const response = await request(app.getHttpServer())
      .get(`/appointments/${randomUUID()}`)
      .expect(404);

    expect(response.body).toEqual({
      error: 'Appointment not found',
    });
  });

  it('POST /appointments rejects past dates', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .send({
        clinicId,
        patientId,
        startsAt: '2026-11-22T15:00:00Z',
      })
      .expect(400);
  });

  it('POST /appointments rejects dates without timezone', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .send({
        clinicId,
        patientId,
        startsAt: '2026-11-25T15:00:00',
      })
      .expect(400);
  });

  it('POST /appointments rejects patient from another clinic', async () => {
    const otherClinic = await request(app.getHttpServer())
      .post('/clinics')
      .send({
        name: 'Other clinic',
        timezone: 'America/Lima',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/appointments')
      .send({
        clinicId: otherClinic.body.id,
        patientId,
        startsAt,
      })
      .expect(400);
  });

  it('PATCH /appointments/:id replaces pending reminder', async () => {
    const appointment = await createAppointment();

    const response = await request(app.getHttpServer())
      .patch(`/appointments/${appointment.id}`)
      .send({
        startsAt: '2026-11-27T15:00:00Z',
      })
      .expect(200);

    expect(response.body.startsAt)
      .toBe('2026-11-27T15:00:00.000Z');

    expect(response.body.reminders).toHaveLength(2);

    expect(response.body.reminders[0]).toMatchObject({
      id: appointment.reminders[0].id,
      status: 'cancelled',
    });

    expect(response.body.reminders[1]).toMatchObject({
      status: 'pending',
      scheduledFor: '2026-11-26T15:00:00.000Z',
      attempts: 0,
    });
  });

  it('POST /appointments/:id/cancel is idempotent', async () => {
    const appointment = await createAppointment();

    const first = await request(app.getHttpServer())
      .post(`/appointments/${appointment.id}/cancel`)
      .expect(200);

    expect(first.body.status).toBe('cancelled');
    expect(first.body.reminders[0].status).toBe('cancelled');

    const second = await request(app.getHttpServer())
      .post(`/appointments/${appointment.id}/cancel`)
      .expect(200);

    expect(second.body).toEqual(first.body);
  });

  it('PATCH rejects cancelled appointments', async () => {
    const appointment = await createAppointment();

    await request(app.getHttpServer())
      .post(`/appointments/${appointment.id}/cancel`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/appointments/${appointment.id}`)
      .send({
        startsAt: '2026-11-27T15:00:00Z',
      })
      .expect(409);
  });

  it('PATCH rejects appointments already started', async () => {
    const appointment = await createAppointment();

    try {
      await request(app.getHttpServer())
        .put('/test/clock')
        .send({ now: startsAt })
        .expect(204);

      await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}`)
        .send({
          startsAt: '2026-11-27T15:00:00Z',
        })
        .expect(409);
    } finally {
      await request(app.getHttpServer())
        .put('/test/clock')
        .send({ now })
        .expect(204);
    }
  });
});
