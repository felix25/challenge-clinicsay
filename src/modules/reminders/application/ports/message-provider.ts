export type SendMessageResult =
  | 'sent'
  | 'retry'
  | 'failed';

export abstract class MessageProvider {
  abstract send(
    to: string,
    text: string,
    idempotencyKey: string,
  ): Promise<SendMessageResult>;
}
