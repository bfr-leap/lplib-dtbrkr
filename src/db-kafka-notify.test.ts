export {};

jest.mock('kafkajs', () => {
    const connect = jest.fn();
    const send = jest.fn();
    const producerFactory = jest.fn(() => ({ connect, send }));
    const KafkaCtor = jest.fn(() => ({ producer: producerFactory }));
    return {
        Kafka: KafkaCtor,
        __mocks: { connect, send, producerFactory, KafkaCtor },
    };
});

const kafkaMocks = () => (jest.requireMock('kafkajs') as any).__mocks;

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('notifyDbWrite', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.resetModules();
        const { connect, send, producerFactory, KafkaCtor } = kafkaMocks();
        connect.mockReset();
        send.mockReset();
        producerFactory.mockClear();
        KafkaCtor.mockClear();
        connect.mockResolvedValue(undefined);
        send.mockResolvedValue(undefined);
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    it('sends a DbUpdateLogEntry to db-update-log with :strm suffix', async () => {
        const { notifyDbWrite } = require('./db-kafka-notify');
        const { send } = kafkaMocks();

        notifyDbWrite(
            'db-user-cfg',
            'leaguesInterest',
            ['12345'],
            'update'
        );
        await flush();

        expect(send).toHaveBeenCalledTimes(1);
        const call = send.mock.calls[0][0];
        expect(call.topic).toBe('db-update-log');
        expect(call.messages).toHaveLength(1);
        expect(call.messages[0].key).toBeUndefined();

        const msg = JSON.parse(call.messages[0].value);
        expect(msg).toMatchObject({
            dataset_id: 'db-user-cfg:strm',
            source: 'lplib-ldloadutl',
            update_type: 'update',
            affected_fields: ['leaguesInterest/12345'],
            change_summary: 'update: leaguesInterest 12345',
        });
    });

    it('produces a timestamp in seconds (not milliseconds)', async () => {
        const { notifyDbWrite } = require('./db-kafka-notify');
        const { send } = kafkaMocks();

        const before = Math.floor(Date.now() / 1000);
        notifyDbWrite('db-app-cfg', 'track', [42], 'update');
        await flush();
        const after = Math.floor(Date.now() / 1000);

        const msg = JSON.parse(send.mock.calls[0][0].messages[0].value);
        expect(msg.timestamp).toBeGreaterThanOrEqual(before);
        expect(msg.timestamp).toBeLessThanOrEqual(after);
    });

    it('encodes negative integer keys with n prefix in affected_fields', async () => {
        const { notifyDbWrite } = require('./db-kafka-notify');
        const { send } = kafkaMocks();

        notifyDbWrite('db-app-cfg', 'track', [-7], 'update');
        await flush();

        const msg = JSON.parse(send.mock.calls[0][0].messages[0].value);
        expect(msg.affected_fields).toEqual(['track/n7']);
        expect(msg.change_summary).toBe('update: track -7');
    });

    it('passes string keys through verbatim (no n-encoding)', async () => {
        const { notifyDbWrite } = require('./db-kafka-notify');
        const { send } = kafkaMocks();

        notifyDbWrite(
            'db-msgingest',
            'rawMessage',
            ['1234567890123456789'],
            'update'
        );
        await flush();

        const msg = JSON.parse(send.mock.calls[0][0].messages[0].value);
        expect(msg.affected_fields).toEqual([
            'rawMessage/1234567890123456789',
        ]);
    });

    it('serializes all three update_type values', async () => {
        const { notifyDbWrite } = require('./db-kafka-notify');
        const { send } = kafkaMocks();

        notifyDbWrite('db-app-cfg', 'track', [1], 'insert');
        notifyDbWrite('db-app-cfg', 'track', [1], 'update');
        notifyDbWrite('db-app-cfg', 'track', [1], 'delete');
        await flush();

        const types = send.mock.calls.map(
            (c: any[]) => JSON.parse(c[0].messages[0].value).update_type
        );
        expect(types).toEqual(['insert', 'update', 'delete']);
    });

    it('connects once and reuses the producer across calls', async () => {
        const { notifyDbWrite } = require('./db-kafka-notify');
        const { connect, send, KafkaCtor } = kafkaMocks();

        notifyDbWrite('db-user-cfg', 'a', ['u1'], 'update');
        notifyDbWrite('db-user-cfg', 'b', ['u2'], 'update');
        notifyDbWrite('db-user-cfg', 'c', ['u3'], 'update');
        await flush();

        expect(KafkaCtor).toHaveBeenCalledTimes(1);
        expect(connect).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledTimes(3);
    });

    it('silently disables when Kafka connect fails and logs once', async () => {
        const { connect, send } = kafkaMocks();
        connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const { notifyDbWrite } = require('./db-kafka-notify');
        notifyDbWrite('db-user-cfg', 'a', ['u1'], 'update');
        await flush();
        notifyDbWrite('db-user-cfg', 'b', ['u2'], 'update');
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
        const { send } = kafkaMocks();
        send.mockRejectedValueOnce(new Error('broker down'));

        const { notifyDbWrite } = require('./db-kafka-notify');
        expect(() =>
            notifyDbWrite('db-user-cfg', 'a', ['u1'], 'update')
        ).not.toThrow();
        await flush();

        const sendFailLogs = logSpy.mock.calls.filter(
            (args) =>
                typeof args[0] === 'string' &&
                args[0].includes('db Kafka send failed')
        );
        expect(sendFailLogs).toHaveLength(1);
    });

    it('skips Kafka entirely when KAFKA_DISABLED=1 and logs the payload', async () => {
        const prev = process.env.KAFKA_DISABLED;
        process.env.KAFKA_DISABLED = '1';
        try {
            const { notifyDbWrite } = require('./db-kafka-notify');
            const { connect, send, KafkaCtor } = kafkaMocks();

            notifyDbWrite(
                'db-tracktalk',
                'dotdPublication',
                [99001, -7],
                'update'
            );
            notifyDbWrite('db-user-cfg', 'b', ['u2'], 'update');
            await flush();

            expect(KafkaCtor).not.toHaveBeenCalled();
            expect(connect).not.toHaveBeenCalled();
            expect(send).not.toHaveBeenCalled();

            const devLogs = logSpy.mock.calls.filter(
                (args) =>
                    typeof args[0] === 'string' &&
                    args[0].includes('KAFKA_DISABLED=1') &&
                    args[0].includes(
                        'db message triggered but not delivered'
                    )
            );
            expect(devLogs).toHaveLength(2);

            const firstLog = devLogs[0][0] as string;
            const payloadJson = firstLog.slice(firstLog.indexOf('{'));
            const payload = JSON.parse(payloadJson);
            expect(payload).toMatchObject({
                dataset_id: 'db-tracktalk:strm',
                source: 'lplib-ldloadutl',
                update_type: 'update',
                affected_fields: ['dotdPublication/99001/n7'],
                change_summary: 'update: dotdPublication 99001:-7',
            });
        } finally {
            if (prev === undefined) delete process.env.KAFKA_DISABLED;
            else process.env.KAFKA_DISABLED = prev;
        }
    });

    it('stringifies non-Error rejection values in the failure log', async () => {
        const { send } = kafkaMocks();
        send.mockRejectedValueOnce('raw-string-error');

        const { notifyDbWrite } = require('./db-kafka-notify');
        notifyDbWrite('db-user-cfg', 'a', ['u1'], 'update');
        await flush();

        const sendFailLogs = logSpy.mock.calls.filter(
            (args) =>
                typeof args[0] === 'string' &&
                args[0].includes('raw-string-error')
        );
        expect(sendFailLogs).toHaveLength(1);
    });
});
