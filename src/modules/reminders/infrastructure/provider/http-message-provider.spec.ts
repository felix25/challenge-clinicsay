import { jest } from '@jest/globals';
import { HttpMessageProvider } from './http-message-provider';

describe('HttpMessageProvider', () => {
  const provider = new HttpMessageProvider();
  const phone = '+51999999999';
  const text = 'Appointment reminder';
  const key = 'reminder-001';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [200, 'sent'],
    [202, 'sent'],
    [400, 'failed'],
    [422, 'failed'],
    [503, 'retry'],
    [504, 'retry'],
  ])('maps HTTP %s to %s', async (status, expected) => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(null, { status }),
      );

    await expect(
      provider.send(phone, text, key),
    ).resolves.toBe(expected);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          to: phone,
          text,
        }),
      }),
    );
  });

  it('retries network failures and timeouts', async () => {
    jest.spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network timeout'));

    await expect(
      provider.send(phone, text, key),
    ).resolves.toBe('retry');
  });

  it('configures a five-second timeout for every request', async () => {
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');

    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(null, { status: 202 }),
      );

    await expect(
      provider.send(phone, text, key),
    ).resolves.toBe('sent');

    expect(timeoutSpy).toHaveBeenCalledWith(5000);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('aborts a slow provider request and returns retry', async () => {
    jest.spyOn(globalThis, 'fetch')
      .mockImplementation(async (_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;

          if (!signal) {
            reject(new Error('Missing abort signal'));
            return;
          }

          signal.addEventListener(
            'abort',
            () => reject(signal.reason),
            { once: true },
          );
        });
      });

    const startedAt = performance.now();

    await expect(
      provider.send(phone, text, key),
    ).resolves.toBe('retry');

    const elapsed = performance.now() - startedAt;

    expect(elapsed).toBeGreaterThanOrEqual(4900);
    expect(elapsed).toBeLessThan(6500);
  }, 10000);

});
