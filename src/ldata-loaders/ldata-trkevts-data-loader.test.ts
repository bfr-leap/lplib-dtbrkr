import type { Mock } from 'vitest';
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('./kafka-notify', () => ({ notifyWrite: vi.fn() }));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import {
    getRawPositionChanges,
    getOnTrackOvertakes,
    getOnTrackPitStops,
    getOnTrackIncidents,
    getOnTrackFinishingNotes,
    saveRawPositionChanges,
    saveOnTrackOvertakes,
    saveOnTrackPitStops,
    saveOnTrackIncidents,
    saveOnTrackFinishingNotes,
    getRawPositionChangesAsync,
    getOnTrackOvertakesAsync,
    getOnTrackPitStopsAsync,
    getOnTrackIncidentsAsync,
    getOnTrackFinishingNotesAsync,
    saveRawPositionChangesAsync,
    saveOnTrackOvertakesAsync,
    saveOnTrackPitStopsAsync,
    saveOnTrackIncidentsAsync,
    saveOnTrackFinishingNotesAsync,
} from './ldata-trkevts-data-loader';

const MNT = './public/data/ldata-trkevts/';

beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as Mock).mockReturnValue(true);
    (readFileSync as Mock).mockReturnValue('{"events":[]}');
    (stat as Mock).mockResolvedValue({});
    (readFile as Mock).mockResolvedValue('{"events":[]}');
    (writeFile as Mock).mockResolvedValue(undefined);
    (mkdir as Mock).mockResolvedValue(undefined);
});

const pairs: Array<{
    name: string;
    dataset: string;
    getter: Function;
    saver: Function;
}> = [
    {
        name: 'rawPositionChanges',
        dataset: 'rawPositionChanges',
        getter: getRawPositionChanges,
        saver: saveRawPositionChanges,
    },
    {
        name: 'onTrackOvertakes',
        dataset: 'onTrackOvertakes',
        getter: getOnTrackOvertakes,
        saver: saveOnTrackOvertakes,
    },
    {
        name: 'onTrackPitStops',
        dataset: 'onTrackPitStops',
        getter: getOnTrackPitStops,
        saver: saveOnTrackPitStops,
    },
    {
        name: 'onTrackIncidents',
        dataset: 'onTrackIncidents',
        getter: getOnTrackIncidents,
        saver: saveOnTrackIncidents,
    },
    {
        name: 'onTrackFinishingNotes',
        dataset: 'onTrackFinishingNotes',
        getter: getOnTrackFinishingNotes,
        saver: saveOnTrackFinishingNotes,
    },
];

describe.each(pairs)('trkevts $name', ({ dataset, getter, saver }) => {
    it('reads from the expected nested path', () => {
        getter(1, 2, 3);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}${dataset}/1/2/3.json`,
            expect.any(Object)
        );
    });

    it('returns null when the read fails', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getter(1, 2, 3)).toBeNull();
    });

    it('writes to the expected nested path', () => {
        saver(1, 2, 3, { events: [] });
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}${dataset}/1/2/3.json`,
            '{"events":[]}'
        );
    });
});

const asyncPairs: Array<{
    name: string;
    dataset: string;
    getter: (...args: any[]) => Promise<any>;
    saver: (...args: any[]) => Promise<void>;
}> = [
    {
        name: 'rawPositionChanges',
        dataset: 'rawPositionChanges',
        getter: getRawPositionChangesAsync,
        saver: saveRawPositionChangesAsync,
    },
    {
        name: 'onTrackOvertakes',
        dataset: 'onTrackOvertakes',
        getter: getOnTrackOvertakesAsync,
        saver: saveOnTrackOvertakesAsync,
    },
    {
        name: 'onTrackPitStops',
        dataset: 'onTrackPitStops',
        getter: getOnTrackPitStopsAsync,
        saver: saveOnTrackPitStopsAsync,
    },
    {
        name: 'onTrackIncidents',
        dataset: 'onTrackIncidents',
        getter: getOnTrackIncidentsAsync,
        saver: saveOnTrackIncidentsAsync,
    },
    {
        name: 'onTrackFinishingNotes',
        dataset: 'onTrackFinishingNotes',
        getter: getOnTrackFinishingNotesAsync,
        saver: saveOnTrackFinishingNotesAsync,
    },
];

describe.each(asyncPairs)(
    'trkevts $name async',
    ({ dataset, getter, saver }) => {
        it('reads from the expected nested path', async () => {
            await getter(1, 2, 3);
            expect(readFile).toHaveBeenCalledWith(
                `${MNT}${dataset}/1/2/3.json`,
                expect.any(Object)
            );
        });

        it('returns null when the read fails', async () => {
            (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
            await expect(getter(1, 2, 3)).resolves.toBeNull();
        });

        it('writes to the expected nested path', async () => {
            await saver(1, 2, 3, { events: [] });
            expect(writeFile).toHaveBeenCalledWith(
                `${MNT}${dataset}/1/2/3.json`,
                '{"events":[]}'
            );
        });
    }
);
