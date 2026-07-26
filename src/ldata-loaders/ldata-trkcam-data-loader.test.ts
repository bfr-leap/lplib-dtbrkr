jest.mock('fs');
jest.mock('fs/promises');

import { existsSync, readdirSync, readFileSync } from 'fs';
import { readdir, readFile, stat } from 'fs/promises';
import {
    listWinnerCaptures,
    listWinnerCapturesAsync,
    getWinnerCaptureForSubsession,
    getWinnerCaptureForSubsessionAsync,
    getLatestWinnerCaptureForDriver,
    getLatestWinnerCaptureForDriverAsync,
    readWinnerCaptureBytes,
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
    (existsSync as jest.Mock).mockReturnValue(true);
    (readdirSync as jest.Mock).mockReturnValue(entries);
    (stat as jest.Mock).mockResolvedValue({});
    (readdir as jest.Mock).mockResolvedValue(entries);
}

function mountMissing() {
    (existsSync as jest.Mock).mockReturnValue(false);
    (stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));
}

beforeEach(() => {
    jest.clearAllMocks();
    mountListing(LISTING);
});

describe('listWinnerCaptures', () => {
    it('decodes every capture from its filename', () => {
        expect(listWinnerCaptures()).toEqual([
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
        expect(readdirSync).toHaveBeenCalledWith(WINNERS, {
            withFileTypes: true,
        });
    });

    it('skips entries that are not capture filenames', () => {
        mountListing([
            file('README.md'),
            file('.gitkeep'),
            file('foo.png'),
            file('87426864_418074.png'),
            file('87426864_418074_555362.jpg'),
            dir('87426864_418074_555362.png'),
            file('87426864_418074_555362.png'),
        ]);
        expect(listWinnerCaptures().map((c) => c.file)).toEqual([
            '87426864_418074_555362.png',
        ]);
    });

    it('returns an empty array when the dataset is not mounted', () => {
        mountMissing();
        expect(listWinnerCaptures()).toEqual([]);
        expect(readdirSync).not.toHaveBeenCalled();
    });
});

describe('getWinnerCaptureForSubsession', () => {
    it('picks the highest finish frame within the subsession', () => {
        expect(getWinnerCaptureForSubsession(87426864)?.file).toBe(
            '87426864_418074_555362.png'
        );
    });

    it('returns null for a subsession with no capture', () => {
        expect(getWinnerCaptureForSubsession(1)).toBeNull();
    });

    it('returns null when the dataset is not mounted', () => {
        mountMissing();
        expect(getWinnerCaptureForSubsession(87426864)).toBeNull();
    });
});

describe('getLatestWinnerCaptureForDriver', () => {
    it('picks the highest subsession the driver won', () => {
        expect(getLatestWinnerCaptureForDriver(532988)?.file).toBe(
            '87426864_239914_532988.png'
        );
    });

    it('breaks ties within a subsession on the highest finish frame', () => {
        mountListing([
            file('87426864_239914_777000.png'),
            file('87426864_418074_777000.png'),
        ]);
        expect(getLatestWinnerCaptureForDriver(777000)?.file).toBe(
            '87426864_418074_777000.png'
        );
    });

    it('returns null for a driver with no capture', () => {
        expect(getLatestWinnerCaptureForDriver(999999)).toBeNull();
    });
});

describe('readWinnerCaptureBytes', () => {
    it('reads the file as raw bytes, with no encoding', () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        (readFileSync as jest.Mock).mockReturnValue(png);

        expect(readWinnerCaptureBytes('87426864_418074_555362.png')).toBe(png);
        expect(readFileSync).toHaveBeenCalledWith(
            `${WINNERS}/87426864_418074_555362.png`
        );
    });

    it('returns null when the file is missing', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(readWinnerCaptureBytes('87426864_418074_555362.png')).toBeNull();
    });

    it('rejects names that are not capture filenames without touching fs', () => {
        expect(readWinnerCaptureBytes('../../../etc/passwd')).toBeNull();
        expect(readWinnerCaptureBytes('winners/../../secret.png')).toBeNull();
        expect(readWinnerCaptureBytes('')).toBeNull();
        expect(readFileSync).not.toHaveBeenCalled();
    });
});

describe('async accessors', () => {
    it('list, select and read through fs/promises', async () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        (readFile as jest.Mock).mockResolvedValue(png);

        expect((await listWinnerCapturesAsync()).length).toBe(3);
        expect(readdir).toHaveBeenCalledWith(WINNERS, { withFileTypes: true });

        expect((await getWinnerCaptureForSubsessionAsync(87426864))?.file).toBe(
            '87426864_418074_555362.png'
        );
        expect((await getLatestWinnerCaptureForDriverAsync(532988))?.file).toBe(
            '87426864_239914_532988.png'
        );

        await expect(
            readWinnerCaptureBytesAsync('87426864_418074_555362.png')
        ).resolves.toBe(png);
        expect(readFile).toHaveBeenCalledWith(
            `${WINNERS}/87426864_418074_555362.png`
        );
    });

    it('returns empty/null when the dataset is not mounted', async () => {
        mountMissing();
        await expect(listWinnerCapturesAsync()).resolves.toEqual([]);
        await expect(
            getWinnerCaptureForSubsessionAsync(87426864)
        ).resolves.toBeNull();
        await expect(
            getLatestWinnerCaptureForDriverAsync(532988)
        ).resolves.toBeNull();
        expect(readdir).not.toHaveBeenCalled();
    });

    it('returns null on an unreadable file and on a bad name', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(
            readWinnerCaptureBytesAsync('87426864_418074_555362.png')
        ).resolves.toBeNull();

        await expect(
            readWinnerCaptureBytesAsync('../../../etc/passwd')
        ).resolves.toBeNull();
        expect(readFile).toHaveBeenCalledTimes(1);
    });
});
