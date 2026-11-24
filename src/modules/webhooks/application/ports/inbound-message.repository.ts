export interface InboundMessage {
  messageId: string;
  from: string;
  text: string;
  receivedAt: Date;
}

export type InboundDecision = 'confirm' | 'cancel' | 'ignore';

export abstract class InboundMessageRepository {
  abstract process(
    message: InboundMessage,
    decision: InboundDecision,
    now: Date,
  ): Promise<void>;
}
