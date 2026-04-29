import type { Mock } from 'vitest';
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('./kafka-notify', () => ({ notifyWrite: vi.fn() }));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import {
    getTelemetrySubsessions,
    saveTelemetrySubsessions,
    getTelemetryScan,
    getTelemetrySubsessionsAsync,
    saveTelemetrySubsessionsAsync,
    getTelemetryScanAsync,
} from './ldata-irrpy-data-loader';
import { notifyWrite } from './kafka-notify';

const MNT = './public/data/ldata-irrpy/';

beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as Mock).mockReturnValue(true);
    (stat as Mock).mockResolvedValue({});
    (writeFile as Mock).mockResolvedValue(undefined);
    (mkdir as Mock).mockResolvedValue(undefined);
});

describe('getTelemetrySubsessions', () => {
    it('reads and parses the per-league file', () => {
        (readFileSync as Mock).mockReturnValue('[1, 2, 3]');
        expect(getTelemetrySubsessions(42)).toEqual([1, 2, 3]);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}telemetrySubsessions/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getTelemetrySubsessions(42)).toBeNull();
    });
});

describe('saveTelemetrySubsessions', () => {
    it('writes the JSON array to the expected path', () => {
        saveTelemetrySubsessions(42, [10, 20]);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}telemetrySubsessions/42.json`,
            '[10,20]'
        );
    });

    it('emits a Kafka notification with the leagueId as the only key', () => {
        saveTelemetrySubsessions(42, [10, 20]);
        expect(notifyWrite).toHaveBeenCalledWith(
            'ldata-irrpy',
            'telemetrySubsessions',
            [42]
        );
    });
});

describe('getTelemetryScan', () => {
    it('replaces -nan(ind), nan(ind), inf, -inf, --1 with -1 before parsing', () => {
        const payload = JSON.stringify({
            a: 'sentinel-a',
            b: 'sentinel-b',
            c: 'sentinel-c',
            d: 'sentinel-d',
            e: 'sentinel-e',
        })
            .replace('"sentinel-a"', '-nan(ind)')
            .replace('"sentinel-b"', 'nan(ind)')
            .replace('"sentinel-c"', 'inf')
            .replace('"sentinel-d"', '-inf')
            .replace('"sentinel-e"', '--1');

        (readFileSync as Mock).mockReturnValue(payload);

        const result = getTelemetryScan(42, 999);
        expect(result).toEqual({ a: -1, b: -1, c: -1, d: -1, e: -1 });
    });

    it('reads from the nested league/subsession path', () => {
        (readFileSync as Mock).mockReturnValue('{}');
        getTelemetryScan(42, 999);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}telemetryScans/42/999.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getTelemetryScan(42, 999)).toBeNull();
    });
});

describe('getTelemetrySubsessionsAsync', () => {
    it('reads and parses the per-league file', async () => {
        (readFile as Mock).mockResolvedValue('[1, 2, 3]');
        await expect(getTelemetrySubsessionsAsync(42)).resolves.toEqual([
            1, 2, 3,
        ]);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}telemetrySubsessions/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getTelemetrySubsessionsAsync(42)).resolves.toBeNull();
    });
});

describe('saveTelemetrySubsessionsAsync', () => {
    it('writes the JSON array to the expected path', async () => {
        await saveTelemetrySubsessionsAsync(42, [10, 20]);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}telemetrySubsessions/42.json`,
            '[10,20]'
        );
    });

    it('emits a Kafka notification with the leagueId as the only key', async () => {
        await saveTelemetrySubsessionsAsync(42, [10, 20]);
        expect(notifyWrite).toHaveBeenCalledWith(
            'ldata-irrpy',
            'telemetrySubsessions',
            [42]
        );
    });
});

describe('getTelemetryScanAsync', () => {
    it('replaces -nan(ind), nan(ind), inf, -inf, --1 with -1 before parsing', async () => {
        const payload = JSON.stringify({
            a: 'sentinel-a',
            b: 'sentinel-b',
            c: 'sentinel-c',
            d: 'sentinel-d',
            e: 'sentinel-e',
        })
            .replace('"sentinel-a"', '-nan(ind)')
            .replace('"sentinel-b"', 'nan(ind)')
            .replace('"sentinel-c"', 'inf')
            .replace('"sentinel-d"', '-inf')
            .replace('"sentinel-e"', '--1');

        (readFile as Mock).mockResolvedValue(payload);

        const result = await getTelemetryScanAsync(42, 999);
        expect(result).toEqual({ a: -1, b: -1, c: -1, d: -1, e: -1 });
    });

    it('reads from the nested league/subsession path', async () => {
        (readFile as Mock).mockResolvedValue('{}');
        await getTelemetryScanAsync(42, 999);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}telemetryScans/42/999.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getTelemetryScanAsync(42, 999)).resolves.toBeNull();
    });
});
