// `vi.hoisted` lifts the factory above all imports so the same `vi.fn()`
// instances are visible to both the `vi.mock('kafkajs', …)` factory below
// and the test bodies. Without this, the mock and the assertions reference
// different mock identities.
const kafkaMocks = vi.hoisted(() => {
    const connect = vi.fn();
    const send = vi.fn();
    const producerFactory = vi.fn(() => ({ connect, send }));
    // Must be a regular `function` (not an arrow) — `new Kafka(…)` in
    // kafka-notify.ts invokes this with `new`, which arrow functions don't
    // support.
    const KafkaCtor = vi.fn(function () {
        return { producer: producerFactory };
    });
    return { connect, send, producerFactory, KafkaCtor };
});

vi.mock('kafkajs', () => ({ Kafka: kafkaMocks.KafkaCtor }));

import type { MockInstance } from 'vitest';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('notifyWrite', () => {
    let logSpy: MockInstance;

    beforeEach(() => {
        vi.resetModules();
        const { connect, send, producerFactory, KafkaCtor } = kafkaMocks;
        connect.mockReset();
        send.mockReset();
        producerFactory.mockClear();
        KafkaCtor.mockClear();
        connect.mockResolvedValue(undefined);
        send.mockResolvedValue(undefined);
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    it('sends an LdataUpdateLogEntry to ldata-update-log with :strm suffix', async () => {
        const { notifyWrite } = await import('./kafka-notify');
        const { send } = kafkaMocks;

        notifyWrite(
            'ldata-charts',
            'startFinishChartData',
            [1234, 75647843, 0]
        );
        await flush();

        expect(send).toHaveBeenCalledTimes(1);
        const call = send.mock.calls[0][0];
        expect(call.topic).toBe('ldata-update-log');
        expect(call.messages).toHaveLength(1);
        expect(call.messages[0].key).toBeUndefined();

        const msg = JSON.parse(call.messages[0].value);
        expect(msg).toMatchObject({
            dataset_id: 'ldata-charts:strm',
            source: 'lplib-ldloadutl',
            update_type: 'modification',
            affected_fields: ['startFinishChartData/1234/75647843/0'],
            change_summary: 'write: startFinishChartData 1234:75647843:0',
        });
    });

    it('produces a timestamp in seconds (not milliseconds)', async () => {
        const { notifyWrite } = await import('./kafka-notify');
        const { send } = kafkaMocks;

        const before = Math.floor(Date.now() / 1000);
        notifyWrite('ldata-charts', 'd', [1]);
        await flush();
        const after = Math.floor(Date.now() / 1000);

        const msg = JSON.parse(send.mock.calls[0][0].messages[0].value);
        expect(msg.timestamp).toBeGreaterThanOrEqual(before);
        expect(msg.timestamp).toBeLessThanOrEqual(after);
    });

    it('encodes negative keys with n prefix in affected_fields', async () => {
        const { notifyWrite } = await import('./kafka-notify');
        const { send } = kafkaMocks;

        notifyWrite('ldata-irrpy', 'telemetrySubsessions', [-42]);
        await flush();

        const msg = JSON.parse(send.mock.calls[0][0].messages[0].value);
        expect(msg.affected_fields).toEqual(['telemetrySubsessions/n42']);
        expect(msg.change_summary).toBe('write: telemetrySubsessions -42');
    });

    it('connects once and reuses the producer across calls', async () => {
        const { notifyWrite } = await import('./kafka-notify');
        const { connect, send, KafkaCtor } = kafkaMocks;

        notifyWrite('ldata-charts', 'a', [1]);
        notifyWrite('ldata-charts', 'b', [2]);
        notifyWrite('ldata-charts', 'c', [3]);
        await flush();

        expect(KafkaCtor).toHaveBeenCalledTimes(1);
        expect(connect).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledTimes(3);
    });

    it('silently disables when Kafka connect fails and logs once', async () => {
        const { connect, send } = kafkaMocks;
        connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const { notifyWrite } = await import('./kafka-notify');
        notifyWrite('ldata-charts', 'a', [1]);
        await flush();
        notifyWrite('ldata-charts', 'b', [2]);
        await flush();

        expect(send).not.toHaveBeenCalled();
        const disableLogs = logSpy.mock.calls.filter(
            (args) =>
                typeof args[0] === 'string' &&
                args[0].includes('Kafka not available')
        );
        expect(disableLogs).toHaveLength(1);
    });

    it('does not throw when producer.send() rejects', async () => {
        const { send } = kafkaMocks;
        send.mockRejectedValueOnce(new Error('broker down'));

        const { notifyWrite } = await import('./kafka-notify');
        expect(() => notifyWrite('ldata-charts', 'a', [1])).not.toThrow();
        await flush();

        const sendFailLogs = logSpy.mock.calls.filter(
            (args) =>
                typeof args[0] === 'string' &&
                args[0].includes('Kafka send failed')
        );
        expect(sendFailLogs).toHaveLength(1);
    });

    it('stringifies non-Error rejection values in the failure log', async () => {
        const { send } = kafkaMocks;
        send.mockRejectedValueOnce('raw-string-error');

        const { notifyWrite } = await import('./kafka-notify');
        notifyWrite('ldata-charts', 'a', [1]);
        await flush();

        const sendFailLogs = logSpy.mock.calls.filter(
            (args) =>
                typeof args[0] === 'string' &&
                args[0].includes('raw-string-error')
        );
        expect(sendFailLogs).toHaveLength(1);
    });
});
