import { Injectable } from '@nestjs/common';
import {
  MessageProvider,
  SendMessageResult,
} from '../../application/ports/message-provider';

@Injectable()
export class HttpMessageProvider extends MessageProvider {
  async send(
    to: string,
    text: string,
    idempotencyKey: string,
  ): Promise<SendMessageResult> {
    const baseUrl = process.env.PROVIDER_URL ?? 'http://localhost:4010';

    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ to, text }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 200 || response.status === 202) {
        return 'sent';
      }

      if (response.status === 422 || response.status === 400) {
        return 'failed';
      }

      return 'retry';
    } catch {
      // Un timeout puede significar que el mensaje sí fue entregado.
      // El próximo intento conservará la misma clave de idempotencia.
      return 'retry';
    }
  }
}
