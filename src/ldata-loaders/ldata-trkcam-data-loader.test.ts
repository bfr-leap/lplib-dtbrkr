jest.mock('fs');
jest.mock('fs/promises');

import * as fs from 'fs';
import { readdir, readFile, stat } from 'fs/promises';
import {
    listWinnerCapturesAsync,
    getWinnerCaptureForSubsessionAsync,
    getLatestWinnerCaptureForDriverAsync,
    readWinnerCaptureBytesAsync,
} from './ldata-trkcam-data-loader';

const MNT = './public/data/ldata-trkcam/';
const WINNERS = `${MNT}winners`;

interface Dirent {
    name: string;
    isDirectory: () => boolean;
    isFile: () => boolean;
}
const dir = (name: string): Dirent => ({
    name,
    isDirectory: () => true,
    isFile: () => false,
});
const file = (name: string): Dirent => ({
    name,
    isDirectory: () => false,
    isFile: () => true,
});

// Two captures in one subsession (a heat plus a feature), plus an earlier
// subsession won by the same driver as the heat.
const LISTING = [
    file('87426864_239914_532988.png'),
    file('87426864_418074_555362.png'),
    file('85056343_101_532988.png'),
];

function mountListing(entries: Dirent[]) {
    (stat as jest.Mock).mockResolvedValue({});
    (readdir as jest.Mock).mockResolvedValue(entries);
}

function mountMissing() {
    (stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));
}

beforeEach(() => {
    jest.clearAllMocks();
    mountListing(LISTING);
});

// The service reads these on its request path, so a sync fs call anywhere in
// the loader would block the event loop on a multi-megabyte PNG. Guard the
// whole module surface rather than trusting review to catch a regression.
describe('no synchronous filesystem access', () => {
    const SYNC_FNS = [
        'readFileSync',
        'readdirSync',
        'existsSync',
        'statSync',
        'openSync',
        'accessSync',
    ] as const;

    it('never calls a sync fs function on any code path', async () => {
        (readFile as jest.Mock).mockResolvedValue(Buffer.from([0x89]));

        await listWinnerCapturesAsync();
        await getWinnerCaptureForSubsessionAsync(87426864);
        await getLatestWinnerCaptureForDriverAsync(532988);
        await readWinnerCaptureBytesAsync('87426864_418074_555362.png');

        mountMissing();
        await listWinnerCapturesAsync();
        await getWinnerCaptureForSubsessionAsync(87426864);
        await getLatestWinnerCaptureForDriverAsync(532988);
        await readWinnerCaptureBytesAsync('nope');

        for (const name of SYNC_FNS) {
            expect((fs as any)[name]).not.toHaveBeenCalled();
        }
    });

    it('exports no sync variants', () => {
        const mod = require('./ldata-trkcam-data-loader');
        const exported = Object.keys(mod).filter(
            (k) => typeof mod[k] === 'function'
        );
        expect(exported.length).toBeGreaterThan(0);
        for (const name of exported) {
            expect(name).toMatch(/Async$/);
        }
    });
});

describe('listWinnerCapturesAsync', () => {
    it('decodes every capture from its filename', async () => {
        await expect(listWinnerCapturesAsync()).resolves.toEqual([
            {
                subsession_id: 87426864,
                finish_frame: 239914,
                winner_user_id: 532988,
                file: '87426864_239914_532988.png',
            },
            {
                subsession_id: 87426864,
                finish_frame: 418074,
                winner_user_id: 555362,
                file: '87426864_418074_555362.png',
            },
            {
                subsession_id: 85056343,
                finish_frame: 101,
                winner_user_id: 532988,
                file: '85056343_101_532988.png',
            },
        ]);
        expect(readdir).toHaveBeenCalledWith(WINNERS, { withFileTypes: true });
    });

    it('skips entries that are not capture filenames', async () => {
        mountListing([
            file('README.md'),
            file('.gitkeep'),
            file('foo.png'),
            file('87426864_418074.png'),
            file('87426864_418074_555362.jpg'),
            dir('87426864_418074_555362.png'),
            file('87426864_418074_555362.png'),
        ]);
        const captures = await listWinnerCapturesAsync();
        expect(captures.map((c) => c.file)).toEqual([
            '87426864_418074_555362.png',
        ]);
    });

    it('returns an empty array when the dataset is not mounted', async () => {
        mountMissing();
        await expect(listWinnerCapturesAsync()).resolves.toEqual([]);
        expect(readdir).not.toHaveBeenCalled();
    });
});

describe('getWinnerCaptureForSubsessionAsync', () => {
    it('picks the highest finish frame within the subsession', async () => {
        const capture = await getWinnerCaptureForSubsessionAsync(87426864);
        expect(capture?.file).toBe('87426864_418074_555362.png');
    });

    it('returns null for a subsession with no capture', async () => {
        await expect(getWinnerCaptureForSubsessionAsync(1)).resolves.toBeNull();
    });

    it('returns null when the dataset is not mounted', async () => {
        mountMissing();
        await expect(
            getWinnerCaptureForSubsessionAsync(87426864)
        ).resolves.toBeNull();
    });
});

describe('getLatestWinnerCaptureForDriverAsync', () => {
    it('picks the highest subsession the driver won', async () => {
        const capture = await getLatestWinnerCaptureForDriverAsync(532988);
        expect(capture?.file).toBe('87426864_239914_532988.png');
    });

    it('breaks ties within a subsession on the highest finish frame', async () => {
        mountListing([
            file('87426864_239914_777000.png'),
            file('87426864_418074_777000.png'),
        ]);
        const capture = await getLatestWinnerCaptureForDriverAsync(777000);
        expect(capture?.file).toBe('87426864_418074_777000.png');
    });

    it('returns null for a driver with no capture', async () => {
        await expect(
            getLatestWinnerCaptureForDriverAsync(999999)
        ).resolves.toBeNull();
    });
});

describe('readWinnerCaptureBytesAsync', () => {
    it('reads the file as raw bytes, with no encoding', async () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        (readFile as jest.Mock).mockResolvedValue(png);

        await expect(
            readWinnerCaptureBytesAsync('87426864_418074_555362.png')
        ).resolves.toBe(png);
        expect(readFile).toHaveBeenCalledWith(
            `${WINNERS}/87426864_418074_555362.png`
        );
    });

    it('returns null when the file is missing', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(
            readWinnerCaptureBytesAsync('87426864_418074_555362.png')
        ).resolves.toBeNull();
    });

    it('rejects names that are not capture filenames without touching fs', async () => {
        await expect(
            readWinnerCaptureBytesAsync('../../../etc/passwd')
        ).resolves.toBeNull();
        await expect(
            readWinnerCaptureBytesAsync('winners/../../secret.png')
        ).resolves.toBeNull();
        await expect(readWinnerCaptureBytesAsync('')).resolves.toBeNull();
        expect(readFile).not.toHaveBeenCalled();
    });
});
