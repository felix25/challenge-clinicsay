# ClinicSay — Backend Challenge

[![Backend CI](https://github.com/felix25/challenge-clinicsay/actions/workflows/ci.yml/badge.svg)](https://github.com/felix25/challenge-clinicsay/actions/workflows/ci.yml)

Backend para la gestión de clínicas, pacientes, citas y
recordatorios automatizados, incluyendo el procesamiento
de respuestas de pacientes para confirmar o cancelar citas.

La solución está desarrollada con arquitectura hexagonal,
priorizando la separación de responsabilidades, la
testabilidad y la independencia de la persistencia.

## 1. Stack tecnológico

| Tecnología | Propósito |
|---|---|
| Node.js 24 | Entorno de ejecución |
| TypeScript | Tipado estático |
| NestJS | Framework backend e inyección de dependencias |
| PostgreSQL 16 | Persistencia relacional |
| Prisma 6 | Adaptador de acceso a datos y migraciones |
| Luxon | Fechas, zonas horarias y DST |
| Jest | Pruebas automatizadas |
| Supertest | Pruebas HTTP |
| Oxlint | Análisis estático |
| Docker Compose | Entorno reproducible |
| GitHub Actions | Integración continua |

## 2. Instalación y ejecución

### Requisitos

- Docker.
- Docker Compose.
- Node.js 24 y npm para desarrollo y pruebas locales.

### Levantar el proyecto

```bash
git clone https://github.com/felix25/challenge-clinicsay.git
cd challenge-clinicsay

docker compose up --build
```

Docker Compose inicia:

| Servicio | Puerto |
|---|---|
| Backend API | 3000 |
| PostgreSQL | 5432 |
| Proveedor simulado | 4010 |

Las migraciones de PostgreSQL se ejecutan automáticamente
durante el arranque del backend.

### Verificar disponibilidad

```bash
curl -i http://localhost:3000/health
```

Respuesta esperada cuando el servicio está disponible:

```json
{
  "status": "ok"
}
```

### Detener los servicios

```bash
docker compose down
```

Los datos de PostgreSQL se conservan mediante un volumen.

## 3. Configuración

| Variable | Descripción |
|---|---|
| DATABASE_URL | Conexión a PostgreSQL |
| PROVIDER_URL | URL del proveedor de mensajes |
| CLOCK_MODE | Selección del reloj de la aplicación |
| PORT | Puerto HTTP, 3000 por defecto |

El entorno Docker proporcionado utiliza CLOCK_MODE=test
para permitir la evaluación determinista de los escenarios.

Fuera del modo test, la aplicación utiliza el reloj del
sistema y no registra el endpoint de modificación del reloj.

Las credenciales de Docker Compose corresponden únicamente
al entorno local de desarrollo y evaluación.

## 4. Contrato de la API

El contrato de referencia se encuentra en openapi.yaml.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | /health | Estado del servicio |
| POST | /clinics | Registrar clínica |
| POST | /patients | Registrar paciente |
| POST | /appointments | Crear cita |
| GET | /appointments/{id} | Consultar cita y recordatorios |
| PATCH | /appointments/{id} | Reprogramar cita |
| POST | /appointments/{id}/cancel | Cancelar cita |
| POST | /jobs/reminders/run | Procesar recordatorios pendientes |
| POST | /webhooks/inbound-messages | Procesar respuestas |
| PUT | /test/clock | Modificar reloj en modo test |

### Ejemplo: configurar el reloj de pruebas

```bash
curl -X PUT http://localhost:3000/test/clock \
  -H 'Content-Type: application/json' \
  -d '{"now":"2026-11-23T09:00:00.000Z"}'
```

### Ejemplo: registrar una clínica

```bash
curl -X POST http://localhost:3000/clinics \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Clinica Central",
    "timezone": "Europe/Madrid"
  }'
```

### Ejemplo: registrar un paciente

Reemplazar CLINIC_ID por el identificador obtenido
en la respuesta anterior.

```bash
curl -X POST http://localhost:3000/patients \
  -H 'Content-Type: application/json' \
  -d '{
    "clinicId": "CLINIC_ID",
    "name": "Ana",
    "phone": "+34612345678",
    "acceptsReminders": true
  }'
```

### Ejemplo: crear una cita

```bash
curl -X POST http://localhost:3000/appointments \
  -H 'Content-Type: application/json' \
  -d '{
    "clinicId": "CLINIC_ID",
    "patientId": "PATIENT_ID",
    "startsAt": "2026-11-24T09:00:00.000Z"
  }'
```

### Ejemplo: ejecutar el procesamiento de recordatorios

```bash
curl -X POST http://localhost:3000/jobs/reminders/run
```

### Ejemplo: confirmar una cita

Después de enviar el recordatorio:

```bash
curl -X POST http://localhost:3000/webhooks/inbound-messages \
  -H 'Content-Type: application/json' \
  -d '{
    "messageId": "message-001",
    "from": "+34612345678",
    "text": "SI",
    "receivedAt": "2026-11-23T09:01:00.000Z"
  }'
```

## 5. Arquitectura

Se utiliza un monolito modular con arquitectura hexagonal
(Ports and Adapters).

La elección permite mantener un despliegue sencillo sin
renunciar a la separación de responsabilidades.

```mermaid
flowchart LR
    HTTP[HTTP Controllers] --> APP[Application / Use Cases]
    APP --> DOMAIN[Domain]
    APP --> PORTS[Application Ports]
    PRISMA[Prisma Adapters] -. implements .-> PORTS
    PROVIDER[HTTP Message Provider] -. implements .-> PORTS
    CLOCK[Clock Adapters] -. implements .-> PORTS
    PRISMA --> DB[(PostgreSQL)]
    PROVIDER --> EXT[External Provider]
```

### Dominio

Contiene entidades y reglas de negocio, incluyendo:

- Clínicas, pacientes, citas y recordatorios.
- Cálculo de fechas de recordatorios.
- Determinación del estado inicial del recordatorio.
- Generación del mensaje de recordatorio.

El dominio no depende de Prisma ni de PostgreSQL.

### Aplicación

Contiene casos de uso y contratos de comunicación con
los adaptadores externos.

Los casos de uso trabajan con puertos de persistencia,
mensajería y reloj, sin realizar consultas SQL directamente.

### Infraestructura

Contiene las implementaciones concretas:

- Controladores HTTP de NestJS.
- Repositorios Prisma.
- Adaptador HTTP del proveedor de mensajes.
- Reloj real y reloj controlado.
- Filtro global de excepciones.
- Endpoint de disponibilidad.

NestJS conecta los puertos y adaptadores mediante
inyección de dependencias.

### Estructura del proyecto

```text
src/
├── modules/
│   ├── appointments/
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── use-cases/
│   │   └── infrastructure/
│   ├── clinics/
│   ├── patients/
│   ├── reminders/
│   └── webhooks/
├── shared/
│   ├── application/
│   │   └── ports/
│   └── infrastructure/
│       ├── clock/
│       ├── health/
│       ├── http/
│       └── prisma/
├── app.module.ts
└── main.ts

prisma/
├── migrations/
└── schema.prisma

provider/
test/
.github/workflows/
```

### Independencia de la persistencia

Los repositorios se definen como contratos de aplicación.

Para sustituir PostgreSQL o Prisma sería necesario
implementar nuevos adaptadores que respeten dichos
contratos y sus garantías transaccionales.

No sería necesario reescribir los casos de uso por el
simple cambio de tecnología de persistencia.

Las operaciones de entrega y deduplicación encapsulan
actualmente parte de la coordinación de estados dentro
de los adaptadores transaccionales. Una evolución futura
podría separar todavía más esas políticas de negocio.

## 6. Decisiones técnicas

### 6.1. Zonas horarias y horario de verano

Las fechas se almacenan como instantes UTC.

Para calcular el recordatorio se convierte la fecha de
la cita a la zona horaria IANA de la clínica mediante
Luxon.

Se resta un día de calendario, no 24 horas absolutas.

Esto permite conservar la hora local correspondiente
cuando existen cambios de horario de verano o invierno.

El algoritmo:

1. Convierte la cita a la zona horaria de la clínica.
2. Resta un día de calendario.
3. Si el resultado ya pasó, utiliza el reloj actual.
4. Aplica el horario de silencio de 21:00 a 09:00.
5. Convierte el resultado a UTC.
6. Si el resultado no es anterior a la cita, crea
   el recordatorio como skipped con motivo too_late.

Se incluyen pruebas para Europe/Madrid, Atlantic/Canary
y America/Lima, incluyendo transiciones DST.

### 6.2. Ciclo de vida de las citas

La creación de una cita y su recordatorio se realiza
mediante una operación de persistencia conjunta.

La reprogramación cancela los recordatorios pendientes
anteriores y crea uno nuevo.

Si la cita estaba confirmada, vuelve al estado scheduled.

La cancelación actualiza la cita y cancela sus
recordatorios pendientes.

Las operaciones de reprogramación y cancelación utilizan
transacciones y bloqueo de la cita para coordinar
modificaciones concurrentes.

### 6.3. Concurrencia de recordatorios

El procesamiento de recordatorios utiliza PostgreSQL
como mecanismo de coordinación.

Se emplea una operación atómica de adquisición con:

- FOR UPDATE SKIP LOCKED.
- Un identificador de adquisición (claimToken).
- Un vencimiento temporal de la adquisición (leaseUntil).

Esto permite que varias ejecuciones del job procesen
recordatorios sin adquirir simultáneamente el mismo
registro durante una adquisición vigente.

El resultado se persiste verificando el claimToken.

El vencimiento permite recuperar trabajo abandonado
cuando un proceso se interrumpe.

La solución no depende de un mutex en memoria, por lo
que puede funcionar con varias instancias de la API.

### 6.4. Idempotencia del proveedor

El identificador del recordatorio se utiliza como
Idempotency-Key en las solicitudes al proveedor.

La misma clave se conserva en todos los reintentos.

Si el proveedor entrega el mensaje pero la respuesta
se pierde, el siguiente intento reutiliza esa clave.

La garantía de no duplicar la entrega depende también
del contrato de idempotencia del proveedor.

No se pretende garantizar exactly-once universal
sobre una red distribuida.

### 6.5. Reintentos y errores

| Resultado | Comportamiento |
|---|---|
| HTTP 200 / 202 | Recordatorio enviado |
| HTTP 400 / 422 | Fallo permanente |
| HTTP 503 / 504 | Reintento |
| Error de conexión | Reintento |
| Timeout de 5 segundos | Reintento |

Se permiten hasta tres intentos:

- Primer intento en la fecha programada.
- Segundo intento un minuto después del primer fallo.
- Tercer intento cinco minutos después del segundo fallo.

Los reintentos no están sujetos al horario de silencio.

Antes del envío se comprueba que la cita no haya
comenzado y que el paciente tenga teléfono y acepte
recordatorios.

### 6.6. Procesamiento de respuestas

Las respuestas se normalizan eliminando diferencias
de mayúsculas, acentos, espacios y puntuación exterior.

- SI confirma la cita.
- NO cancela la cita.
- Otros mensajes no modifican su estado.

Cuando varios pacientes comparten teléfono, se selecciona
la cita elegible cuyo recordatorio enviado sea más reciente.

Se excluyen las citas canceladas o que ya comenzaron.

El messageId se registra como identificador único en
PostgreSQL.

El registro del mensaje y la actualización correspondiente
se realizan dentro de una transacción.

Esto evita procesar repetidamente el mismo mensaje,
incluso ante solicitudes duplicadas concurrentes.

### 6.7. Reloj controlado

Todos los cálculos de tiempo de los casos de uso
dependen del puerto Clock.

Existen dos implementaciones:

- SystemClock: utiliza la fecha real.
- TestClock: permite controlar el tiempo.

ClockModule registra dinámicamente el adaptador
correspondiente.

El endpoint /test/clock no se registra fuera del modo test.

Esto permite probar fechas futuras, reintentos y
transiciones horarias sin esperar tiempo real.

### 6.8. Decisiones de alcance

Se eligió PostgreSQL como mecanismo de persistencia y
coordinación para reducir componentes operativos.

No se introdujeron Redis, Kafka, RabbitMQ ni microservicios
porque no eran necesarios para resolver el alcance inicial.

Se priorizó:

- Cumplimiento del contrato HTTP.
- Consistencia de los datos.
- Concurrencia e idempotencia.
- Pruebas reproducibles.
- Facilidad de ejecución y mantenimiento.

## 7. Pruebas automatizadas

La estrategia combina pruebas unitarias, integración
de módulos y pruebas end-to-end.

### Instalar dependencias

```bash
npm ci
npx prisma generate
```

### Pruebas unitarias e integración de módulos

```bash
npm test -- --runInBand
```

### Cobertura

```bash
npm run test:cov -- --runInBand
```

### Pruebas E2E

Las pruebas E2E utilizan una base de datos y un proveedor
simulado independientes del entorno principal.

```bash
docker compose \
  -p clinicsay-e2e \
  -f docker-compose.test.yml \
  up -d --build --wait
```

Aplicar las migraciones de la base de datos de pruebas:

```bash
DATABASE_URL=postgresql://clinicsay:clinicsay@localhost:5434/clinicsay_test \
  npx prisma migrate deploy
```

Ejecutar las pruebas:

```bash
npm run test:e2e
```

Detener la infraestructura de pruebas:

```bash
docker compose \
  -p clinicsay-e2e \
  -f docker-compose.test.yml \
  down
```

### Escenarios cubiertos

- Registro y validación de clínicas y pacientes.
- Creación, consulta, reprogramación y cancelación de citas.
- Cálculo de recordatorios y transiciones DST.
- Horario de silencio.
- Recordatorios omitidos por too_late.
- Pacientes sin teléfono o sin consentimiento.
- Envío exitoso y fallos permanentes.
- Reintentos y agotamiento de intentos.
- Reintentos durante el horario de silencio.
- Timeout del proveedor.
- Respuestas perdidas e idempotencia.
- Ejecuciones concurrentes del job.
- Confirmaciones y cancelaciones mediante webhook.
- Normalización de respuestas.
- Teléfonos compartidos.
- Deduplicación concurrente de mensajes.
- Registro condicional del reloj de pruebas.

## 8. Calidad e integración continua

Validaciones disponibles:

```bash
npm run lint
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:e2e
```

GitHub Actions ejecuta estas comprobaciones en cada
push y pull request sobre main.

El pipeline instala las dependencias, genera Prisma
Client, inicia la infraestructura de pruebas, aplica
las migraciones y ejecuta las pruebas E2E.

No requiere servicios externos ni credenciales
productivas.

## 9. Limitaciones y mejoras futuras

El proyecto está limitado al alcance de la prueba técnica.

No incluye:

- Autenticación ni autorización.
- Interfaz gráfica.
- Integración real con WhatsApp.
- Edición avanzada de clínicas y pacientes.
- Paginación.
- Infraestructura cloud productiva.
- Planificador automático de producción.

El procesamiento de recordatorios se encuentra disponible
mediante el endpoint del job. En producción se requiere
un planificador que lo invoque cada minuto.

Con más tiempo se priorizaría:

- Pruebas de carga y recuperación ante caídas.
- Pruebas adicionales de carreras entre envío,
  cancelación y reprogramación.
- Recuperación y tratamiento de conflictos transaccionales.
- Mayor separación de las políticas de reintentos
  respecto del adaptador de persistencia.
- Optimización de índices y procesamiento por lotes
  según métricas reales.
- Observabilidad y alertas operativas.
- Validación de autenticidad de webhooks reales.

## 10. Propuesta para producción

Escenario: 500 clínicas y aproximadamente 20 000
recordatorios diarios.

### Infraestructura propuesta

```mermaid
flowchart TD
    CLIENT[Clientes / Integraciones] --> ALB[Load Balancer]
    ALB --> API[NestJS - ECS Fargate]
    API --> DB[(RDS PostgreSQL)]
    SCHEDULER[EventBridge Scheduler] --> JOB[Reminder Job / Worker]
    JOB --> DB
    JOB --> WA[WhatsApp Business Provider]
    WA --> ALB
    API --> OBS[CloudWatch / OpenTelemetry]
    JOB --> OBS
```

Se desplegaría la API como contenedor en ECS Fargate,
con PostgreSQL administrado mediante Amazon RDS.

EventBridge Scheduler activaría el procesamiento de
recordatorios cada minuto mediante un mecanismo interno
autenticado.

Los workers compartirían PostgreSQL y conservarían el
mecanismo de adquisición concurrente.

### Capacidad

20 000 recordatorios diarios equivalen aproximadamente
a 14 recordatorios por minuto en promedio.

El tráfico real tendrá picos debido a horarios de citas,
zonas horarias y reintentos.

Inicialmente mantendría PostgreSQL como coordinador y
mediría la capacidad antes de incorporar una cola externa.

Si fuera necesario desacoplar la ejecución, evaluaría
SQS con workers independientes, manteniendo la
idempotencia y consistencia mediante un patrón outbox.

### Observabilidad

Monitorizaría:

- Recordatorios pendientes y retraso de procesamiento.
- Envíos exitosos, fallidos y omitidos.
- Cantidad de reintentos.
- Latencia y errores del proveedor.
- Adquisiciones expiradas.
- Conflictos y conexiones de PostgreSQL.
- Disponibilidad de la API.

Utilizaría logs estructurados, métricas, trazas y
alertas, evitando registrar datos personales sensibles.

### Seguridad y operación

- Secrets Manager para credenciales.
- TLS y redes privadas para PostgreSQL.
- Autenticación de endpoints internos.
- Validación de firmas de webhooks.
- Backups automáticos y recuperación a un punto temporal.
- Migraciones controladas durante los despliegues.
- Políticas de retención y protección de datos conforme
  a los requisitos aplicables del RGPD.

## 11. Uso de inteligencia artificial

Durante el desarrollo se utilizó ChatGPT como herramienta
de asistencia para:

- Analizar los requisitos del enunciado.
- Diseñar la estructura hexagonal.
- Proponer implementaciones y pruebas automatizadas.
- Diagnosticar errores de compilación y ejecución.
- Revisar escenarios funcionales y casos límite.
- Preparar documentación e integración continua.

El desarrollo se realizó de manera incremental, ejecutando
las pruebas localmente, revisando los resultados y
registrando los cambios mediante commits.

La revisión iterativa permitió detectar y corregir
problemas como:

- Normalización incompleta de puntuación en webhooks.
- Persistencia incorrecta de recordatorios too_late.
- Registro del controlador de pruebas fuera del modo test.
- Tipado insuficiente de mocks de Jest.
- Inclusión de archivos de respaldo en TypeScript.

Las instrucciones de arquitectura y desarrollo para
agentes de IA se encuentran en AGENTS.md.
