import { Kafka, type Producer } from 'kafkajs';

const BROKER = 'leap-relay1:9092';
const CLIENT_ID = 'lplib-ldloadutl';
const TOPIC = 'db-update-log';
const SOURCE = 'lplib-ldloadutl';
const STREAM_SUFFIX = ':strm';

export type DbUpdateType = 'insert' | 'update' | 'delete';

let producer: Producer | null = null;
let initPromise: Promise<void> | null = null;
let disabled = false;
const devDisabled = process.env.KAFKA_DISABLED === '1';

function init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        try {
            const kafka = new Kafka({
                clientId: CLIENT_ID,
                brokers: [BROKER],
            });
            const p = kafka.producer();
            await p.connect();
            producer = p;
        } catch (e) {
            disabled = true;
            console.log(
                'ldloadutl: Kafka not available, db notifications disabled'
            );
        }
    })();
    return initPromise;
}

export function notifyDbWrite(
    namespace: string,
    entityName: string,
    keys: (number | string)[],
    updateType: DbUpdateType
): void {
    if (disabled) return;

    const keyStrings = keys.map((k) =>
        typeof k === 'number' && k < 0 ? `n${-k}` : String(k)
    );
    const affectedField = [entityName, ...keyStrings].join('/');
    const summaryKeys = keys.join(':');

    const payload = {
        dataset_id: `${namespace}${STREAM_SUFFIX}`,
        source: SOURCE,
        timestamp: Math.floor(Date.now() / 1000),
        update_type: updateType,
        affected_fields: [affectedField],
        change_summary: `${updateType}: ${entityName} ${summaryKeys}`,
    };

    if (devDisabled) {
        console.log(
            `ldloadutl: KAFKA_DISABLED=1, db message triggered but not delivered: ${JSON.stringify(payload)}`
        );
        return;
    }

    init()
        .then(() => {
            if (!producer) return;
            return producer.send({
                topic: TOPIC,
                messages: [{ value: JSON.stringify(payload) }],
            });
        })
        .catch((e) => {
            console.log(`ldloadutl: db Kafka send failed: ${e?.message ?? e}`);
        });
}
