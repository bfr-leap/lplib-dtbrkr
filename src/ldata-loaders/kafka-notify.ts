import { Kafka, type Producer } from 'kafkajs';

const BROKER = 'leap-relay1:9092';
const CLIENT_ID = 'lplib-ldloadutl';
const TOPIC = 'ldata-update-log';
const SOURCE = 'lplib-ldloadutl';
const STREAM_SUFFIX = ':strm';

let producer: Producer | null = null;
let initPromise: Promise<void> | null = null;
let disabled = false;

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
                'ldloadutl: Kafka not available, notifications disabled'
            );
        }
    })();
    return initPromise;
}

export function notifyWrite(
    datasetId: string,
    datasetName: string,
    keys: (number | string)[]
): void {
    if (disabled) return;

    const keyStrings = keys.map((k) =>
        typeof k === 'number' && k < 0 ? `n${-k}` : String(k)
    );
    const affectedField = [datasetName, ...keyStrings].join('/');
    const summaryKeys = keys.join(':');

    const payload = {
        dataset_id: `${datasetId}${STREAM_SUFFIX}`,
        source: SOURCE,
        timestamp: Math.floor(Date.now() / 1000),
        update_type: 'modification',
        affected_fields: [affectedField],
        change_summary: `write: ${datasetName} ${summaryKeys}`,
    };

    init()
        .then(() => {
            if (!producer) return;
            return producer.send({
                topic: TOPIC,
                messages: [{ value: JSON.stringify(payload) }],
            });
        })
        .catch((e) => {
            console.log(`ldloadutl: Kafka send failed: ${e?.message ?? e}`);
        });
}
