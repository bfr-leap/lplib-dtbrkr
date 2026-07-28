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
    HIGHLIGHT_CATEGORIES,
    isHighlightCategory,
    listHighlightCaptures,
    listHighlightCapturesAsync,
    getHighlightCapturesForSubsession,
    getHighlightCapturesForSubsessionAsync,
    getHighlightCapturesForDriver,
    getHighlightCapturesForDriverAsync,
    readHighlightCaptureBytes,
    readHighlightCaptureBytesAsync,
} from './ldata-trkcam-data-loader';

const MNT = './public/data/ldata-trkcam/';
const WINNERS = `${MNT}winners`;
const HIGHLIGHTS = `${MNT}highlights`;

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

// The highlight accessors read one directory per category, so their mocks
// have to dispatch on path rather than return a single fixed listing. A
// category absent from `byCategory` stands in for a directory that isn't on
// disk — the producer only creates a category once it has something to file.
function mountHighlights(byCategory: { [category: string]: Dirent[] }) {
    const listingFor = (path: string): Dirent[] | undefined => {
        const match = /highlights\/([^/]+)$/.exec(path);
        return match === null ? undefined : byCategory[match[1]];
    };
    (existsSync as jest.Mock).mockImplementation(
        (path: string) => listingFor(path) !== undefined
    );
    (readdirSync as jest.Mock).mockImplementation(
        (path: string) => listingFor(path) ?? []
    );
    (stat as jest.Mock).mockImplementation(async (path: string) => {
        if (listingFor(path) === undefined) {
            throw new Error('ENOENT');
        }
        return {};
    });
    (readdir as jest.Mock).mockImplementation(
        async (path: string) => listingFor(path) ?? []
    );
}

// Driver 879688 shows up twice — an overtake in the later subsession and a
// start in the earlier one — so driver queries have something to order.
// `overtakes` is deliberately listed out of replay order.
const HIGHLIGHT_LISTINGS = {
    crashes: [file('87426864_223757_1075458.png')],
    overtakes: [
        file('87426864_389791_532988.png'),
        file('87426864_199243_879688.png'),
    ],
    starts: [file('85056343_50_879688.png')],
};

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

// --- Highlights ---------------------------------------------------------

describe('isHighlightCategory', () => {
    it('accepts exactly the four known categories', () => {
        expect([...HIGHLIGHT_CATEGORIES]).toEqual([
            'battles',
            'crashes',
            'overtakes',
            'starts',
        ]);
        for (const category of HIGHLIGHT_CATEGORIES) {
            expect(isHighlightCategory(category)).toBe(true);
        }
    });

    it('rejects anything else, including path fragments', () => {
        expect(isHighlightCategory('winners')).toBe(false);
        expect(isHighlightCategory('..')).toBe(false);
        expect(isHighlightCategory('overtakes/../../etc')).toBe(false);
        expect(isHighlightCategory('')).toBe(false);
    });
});

describe('listHighlightCaptures', () => {
    beforeEach(() => mountHighlights(HIGHLIGHT_LISTINGS));

    it('decodes every highlight from its filename and category directory', () => {
        expect(listHighlightCaptures('crashes')).toEqual([
            {
                subsession_id: 87426864,
                frame: 223757,
                driver_user_id: 1075458,
                category: 'crashes',
                file: '87426864_223757_1075458.png',
            },
        ]);
        expect(readdirSync).toHaveBeenCalledWith(`${HIGHLIGHTS}/crashes`, {
            withFileTypes: true,
        });
    });

    it('orders a category by ascending frame, not by listing order', () => {
        expect(listHighlightCaptures('overtakes').map((c) => c.frame)).toEqual([
            199243, 389791,
        ]);
    });

    it('scans every category in declared order when none is given', () => {
        expect(
            listHighlightCaptures().map((c) => `${c.category}/${c.file}`)
        ).toEqual([
            'crashes/87426864_223757_1075458.png',
            'overtakes/87426864_199243_879688.png',
            'overtakes/87426864_389791_532988.png',
            'starts/85056343_50_879688.png',
        ]);
    });

    it('skips a category directory that is not on disk', () => {
        // `battles` is absent from the fixture; the scan must not throw.
        expect(listHighlightCaptures('battles')).toEqual([]);
        expect(readdirSync).not.toHaveBeenCalled();
    });

    it('skips entries that are not capture filenames', () => {
        mountHighlights({
            overtakes: [
                file('README.md'),
                file('87426864_199243.png'),
                file('87426864_199243_879688.jpg'),
                dir('87426864_199243_879688.png'),
                file('87426864_199243_879688.png'),
            ],
        });
        expect(listHighlightCaptures('overtakes').map((c) => c.file)).toEqual([
            '87426864_199243_879688.png',
        ]);
    });

    it('returns an empty array for an unknown category without touching fs', () => {
        expect(
            listHighlightCaptures('nope' as typeof HIGHLIGHT_CATEGORIES[number])
        ).toEqual([]);
        expect(existsSync).not.toHaveBeenCalled();
        expect(readdirSync).not.toHaveBeenCalled();
    });

    it('returns an empty array when the dataset is not mounted', () => {
        mountHighlights({});
        expect(listHighlightCaptures()).toEqual([]);
        expect(readdirSync).not.toHaveBeenCalled();
    });
});

describe('getHighlightCapturesForSubsession', () => {
    beforeEach(() => mountHighlights(HIGHLIGHT_LISTINGS));

    it('returns every highlight from the subsession across categories', () => {
        expect(
            getHighlightCapturesForSubsession(87426864).map((c) => c.file)
        ).toEqual([
            '87426864_223757_1075458.png',
            '87426864_199243_879688.png',
            '87426864_389791_532988.png',
        ]);
    });

    it('narrows to a single category when one is given', () => {
        expect(
            getHighlightCapturesForSubsession(87426864, 'overtakes').map(
                (c) => c.category
            )
        ).toEqual(['overtakes', 'overtakes']);
    });

    it('returns an empty array for a subsession with no highlights', () => {
        expect(getHighlightCapturesForSubsession(1)).toEqual([]);
    });
});

describe('getHighlightCapturesForDriver', () => {
    beforeEach(() => mountHighlights(HIGHLIGHT_LISTINGS));

    it('orders the driver’s highlights newest subsession first', () => {
        expect(
            getHighlightCapturesForDriver(879688).map(
                (c) => `${c.subsession_id}/${c.category}`
            )
        ).toEqual(['87426864/overtakes', '85056343/starts']);
    });

    it('narrows to a single category when one is given', () => {
        expect(
            getHighlightCapturesForDriver(879688, 'starts').map((c) => c.file)
        ).toEqual(['85056343_50_879688.png']);
    });

    it('returns an empty array for a driver with no highlights', () => {
        expect(getHighlightCapturesForDriver(999999)).toEqual([]);
    });
});

describe('readHighlightCaptureBytes', () => {
    beforeEach(() => mountHighlights(HIGHLIGHT_LISTINGS));

    it('reads the file from its category directory as raw bytes', () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        (readFileSync as jest.Mock).mockReturnValue(png);

        expect(
            readHighlightCaptureBytes('overtakes', '87426864_199243_879688.png')
        ).toBe(png);
        expect(readFileSync).toHaveBeenCalledWith(
            `${HIGHLIGHTS}/overtakes/87426864_199243_879688.png`
        );
    });

    it('returns null when the file is missing', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(
            readHighlightCaptureBytes('overtakes', '87426864_199243_879688.png')
        ).toBeNull();
    });

    it('rejects an unknown category without touching fs', () => {
        expect(
            readHighlightCaptureBytes('winners', '87426864_239914_532988.png')
        ).toBeNull();
        expect(
            readHighlightCaptureBytes(
                '../winners',
                '87426864_239914_532988.png'
            )
        ).toBeNull();
        expect(readFileSync).not.toHaveBeenCalled();
    });

    it('rejects names that are not capture filenames without touching fs', () => {
        expect(
            readHighlightCaptureBytes('overtakes', '../../../etc/passwd')
        ).toBeNull();
        expect(
            readHighlightCaptureBytes('overtakes', '../winners/x.png')
        ).toBeNull();
        expect(readHighlightCaptureBytes('overtakes', '')).toBeNull();
        expect(readFileSync).not.toHaveBeenCalled();
    });
});

describe('async highlight accessors', () => {
    beforeEach(() => mountHighlights(HIGHLIGHT_LISTINGS));

    it('list, filter and read through fs/promises', async () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        (readFile as jest.Mock).mockResolvedValue(png);

        expect(
            (await listHighlightCapturesAsync()).map(
                (c) => `${c.category}/${c.file}`
            )
        ).toEqual([
            'crashes/87426864_223757_1075458.png',
            'overtakes/87426864_199243_879688.png',
            'overtakes/87426864_389791_532988.png',
            'starts/85056343_50_879688.png',
        ]);
        expect(readdir).toHaveBeenCalledWith(`${HIGHLIGHTS}/overtakes`, {
            withFileTypes: true,
        });

        expect(
            (await getHighlightCapturesForSubsessionAsync(87426864)).length
        ).toBe(3);
        expect(
            (await getHighlightCapturesForDriverAsync(879688)).map(
                (c) => c.subsession_id
            )
        ).toEqual([87426864, 85056343]);

        await expect(
            readHighlightCaptureBytesAsync(
                'overtakes',
                '87426864_199243_879688.png'
            )
        ).resolves.toBe(png);
        expect(readFile).toHaveBeenCalledWith(
            `${HIGHLIGHTS}/overtakes/87426864_199243_879688.png`
        );
    });

    it('returns empty when the dataset is not mounted', async () => {
        mountHighlights({});
        await expect(listHighlightCapturesAsync()).resolves.toEqual([]);
        await expect(
            getHighlightCapturesForSubsessionAsync(87426864)
        ).resolves.toEqual([]);
        await expect(
            getHighlightCapturesForDriverAsync(879688)
        ).resolves.toEqual([]);
        expect(readdir).not.toHaveBeenCalled();
    });

    it('returns null on an unreadable file, a bad name and a bad category', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(
            readHighlightCaptureBytesAsync(
                'overtakes',
                '87426864_199243_879688.png'
            )
        ).resolves.toBeNull();

        await expect(
            readHighlightCaptureBytesAsync('overtakes', '../../../etc/passwd')
        ).resolves.toBeNull();
        await expect(
            readHighlightCaptureBytesAsync(
                'winners',
                '87426864_199243_879688.png'
            )
        ).resolves.toBeNull();
        expect(readFile).toHaveBeenCalledTimes(1);
    });
});
