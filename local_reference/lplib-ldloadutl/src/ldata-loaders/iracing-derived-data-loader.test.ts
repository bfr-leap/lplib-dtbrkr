jest.mock('fs');
jest.mock('fs/promises');
jest.mock('./kafka-notify', () => ({ notifyWrite: jest.fn() }));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import {
    getSimSessionResults,
    getLeaguSubsessionIndex,
    getSimsessionDriverTelemetry,
    getProcessedTelemetryManifest,
    saveProcessedTelemetryManifest,
    getSimSessionResultsAsync,
    getLeaguSubsessionIndexAsync,
    getSimsessionDriverTelemetryAsync,
    getProcessedTelemetryManifestAsync,
    saveProcessedTelemetryManifestAsync,
} from './iracing-derived-data-loader';

const MNT = './public/data/ldata-rsltsts/';

beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
    (stat as jest.Mock).mockResolvedValue({});
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
});

describe('getSimSessionResults', () => {
    it('encodes negative simsession numbers with n prefix', () => {
        (readFileSync as jest.Mock).mockReturnValue('{"entries":[]}');
        getSimSessionResults(9999, -1);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simSessionResults/9999/n1.json`,
            expect.any(Object)
        );
    });

    it('uses raw simsession numbers when non-negative', () => {
        (readFileSync as jest.Mock).mockReturnValue('{"entries":[]}');
        expect(getSimSessionResults(9999, 2)).toEqual({ entries: [] });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simSessionResults/9999/2.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getSimSessionResults(9999, 0)).toBeNull();
    });
});

describe('getLeaguSubsessionIndex', () => {
    it('reads the per-league simsession index', () => {
        (readFileSync as jest.Mock).mockReturnValue('[]');
        expect(getLeaguSubsessionIndex(42)).toEqual([]);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}leagueSimsessionIndex/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getLeaguSubsessionIndex(42)).toBeNull();
    });
});

describe('getSimsessionDriverTelemetry', () => {
    it('encodes negative simsession numbers in the nested path', () => {
        (readFileSync as jest.Mock).mockReturnValue('{}');
        getSimsessionDriverTelemetry(111, -2, 333);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simsessionDriverTelemetry/111/n2/333.json`,
            expect.any(Object)
        );
    });

    it('leaves non-negative simsession numbers as-is', () => {
        (readFileSync as jest.Mock).mockReturnValue('{}');
        getSimsessionDriverTelemetry(111, 2, 333);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simsessionDriverTelemetry/111/2/333.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getSimsessionDriverTelemetry(111, 0, 333)).toBeNull();
    });
});

describe('processed telemetry manifest', () => {
    it('returns an empty Set when no manifest file exists', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        const result = getProcessedTelemetryManifest(42);
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(0);
    });

    it('returns a Set of subsession ids from the manifest', () => {
        (readFileSync as jest.Mock).mockReturnValue('[10, 20, 30]');
        const result = getProcessedTelemetryManifest(42);
        expect(result).toEqual(new Set([10, 20, 30]));
    });

    it('persists the Set as a JSON array at the expected path', () => {
        saveProcessedTelemetryManifest(42, new Set([10, 20, 30]));
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}processedTelemetryManifest/42.json`,
            '[10,20,30]'
        );
    });
});

describe('getSimSessionResultsAsync', () => {
    it('encodes negative simsession numbers with n prefix', async () => {
        (readFile as jest.Mock).mockResolvedValue('{"entries":[]}');
        await getSimSessionResultsAsync(9999, -1);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}simSessionResults/9999/n1.json`,
            expect.any(Object)
        );
    });

    it('uses raw simsession numbers when non-negative', async () => {
        (readFile as jest.Mock).mockResolvedValue('{"entries":[]}');
        await expect(getSimSessionResultsAsync(9999, 2)).resolves.toEqual({
            entries: [],
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}simSessionResults/9999/2.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getSimSessionResultsAsync(9999, 0)).resolves.toBeNull();
    });
});

describe('getLeaguSubsessionIndexAsync', () => {
    it('reads the per-league simsession index', async () => {
        (readFile as jest.Mock).mockResolvedValue('[]');
        await expect(getLeaguSubsessionIndexAsync(42)).resolves.toEqual([]);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}leagueSimsessionIndex/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getLeaguSubsessionIndexAsync(42)).resolves.toBeNull();
    });
});

describe('getSimsessionDriverTelemetryAsync', () => {
    it('encodes negative simsession numbers in the nested path', async () => {
        (readFile as jest.Mock).mockResolvedValue('{}');
        await getSimsessionDriverTelemetryAsync(111, -2, 333);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}simsessionDriverTelemetry/111/n2/333.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(
            getSimsessionDriverTelemetryAsync(111, 0, 333)
        ).resolves.toBeNull();
    });
});

describe('processed telemetry manifest async', () => {
    it('returns an empty Set when no manifest file exists', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        const result = await getProcessedTelemetryManifestAsync(42);
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(0);
    });

    it('returns a Set of subsession ids from the manifest', async () => {
        (readFile as jest.Mock).mockResolvedValue('[10, 20, 30]');
        const result = await getProcessedTelemetryManifestAsync(42);
        expect(result).toEqual(new Set([10, 20, 30]));
    });

    it('persists the Set as a JSON array at the expected path', async () => {
        await saveProcessedTelemetryManifestAsync(42, new Set([10, 20, 30]));
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}processedTelemetryManifest/42.json`,
            '[10,20,30]'
        );
    });
});
