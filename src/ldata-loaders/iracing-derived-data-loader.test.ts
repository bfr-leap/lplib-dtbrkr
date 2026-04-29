import type { Mock } from 'vitest';
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('./kafka-notify', () => ({ notifyWrite: vi.fn() }));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import {
    getSimSessionResults,
    getLeagueSubsessionIndex,
    getSimsessionDriverTelemetry,
    getProcessedTelemetryManifest,
    saveProcessedTelemetryManifest,
    getSimSessionResultsAsync,
    getLeagueSubsessionIndexAsync,
    getSimsessionDriverTelemetryAsync,
    getProcessedTelemetryManifestAsync,
    saveProcessedTelemetryManifestAsync,
    getLeagueDriverStats,
    getLeagueDriverStatsAsync,
    getSingleMemberData,
    getSingleMemberDataAsync,
} from './iracing-derived-data-loader';

const MNT = './public/data/ldata-rsltsts/';

beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as Mock).mockReturnValue(true);
    (stat as Mock).mockResolvedValue({});
    (writeFile as Mock).mockResolvedValue(undefined);
    (mkdir as Mock).mockResolvedValue(undefined);
});

describe('getSimSessionResults', () => {
    it('encodes negative simsession numbers with n prefix', () => {
        (readFileSync as Mock).mockReturnValue('{"entries":[]}');
        getSimSessionResults(9999, -1);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simSessionResults/9999/n1.json`,
            expect.any(Object)
        );
    });

    it('uses raw simsession numbers when non-negative', () => {
        (readFileSync as Mock).mockReturnValue('{"entries":[]}');
        expect(getSimSessionResults(9999, 2)).toEqual({ entries: [] });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simSessionResults/9999/2.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getSimSessionResults(9999, 0)).toBeNull();
    });
});

describe('getLeagueSubsessionIndex', () => {
    it('reads the per-league simsession index', () => {
        (readFileSync as Mock).mockReturnValue('[]');
        expect(getLeagueSubsessionIndex(42)).toEqual([]);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}leagueSimsessionIndex/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getLeagueSubsessionIndex(42)).toBeNull();
    });
});

describe('getSimsessionDriverTelemetry', () => {
    it('encodes negative simsession numbers in the nested path', () => {
        (readFileSync as Mock).mockReturnValue('{}');
        getSimsessionDriverTelemetry(111, -2, 333);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simsessionDriverTelemetry/111/n2/333.json`,
            expect.any(Object)
        );
    });

    it('leaves non-negative simsession numbers as-is', () => {
        (readFileSync as Mock).mockReturnValue('{}');
        getSimsessionDriverTelemetry(111, 2, 333);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simsessionDriverTelemetry/111/2/333.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getSimsessionDriverTelemetry(111, 0, 333)).toBeNull();
    });
});

describe('processed telemetry manifest', () => {
    it('returns an empty Set when no manifest file exists', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        const result = getProcessedTelemetryManifest(42);
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(0);
    });

    it('returns a Set of subsession ids from the manifest', () => {
        (readFileSync as Mock).mockReturnValue('[10, 20, 30]');
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
        (readFile as Mock).mockResolvedValue('{"entries":[]}');
        await getSimSessionResultsAsync(9999, -1);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}simSessionResults/9999/n1.json`,
            expect.any(Object)
        );
    });

    it('uses raw simsession numbers when non-negative', async () => {
        (readFile as Mock).mockResolvedValue('{"entries":[]}');
        await expect(getSimSessionResultsAsync(9999, 2)).resolves.toEqual({
            entries: [],
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}simSessionResults/9999/2.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getSimSessionResultsAsync(9999, 0)).resolves.toBeNull();
    });
});

describe('getLeagueSubsessionIndexAsync', () => {
    it('reads the per-league simsession index', async () => {
        (readFile as Mock).mockResolvedValue('[]');
        await expect(getLeagueSubsessionIndexAsync(42)).resolves.toEqual([]);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}leagueSimsessionIndex/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getLeagueSubsessionIndexAsync(42)).resolves.toBeNull();
    });
});

describe('getSimsessionDriverTelemetryAsync', () => {
    it('encodes negative simsession numbers in the nested path', async () => {
        (readFile as Mock).mockResolvedValue('{}');
        await getSimsessionDriverTelemetryAsync(111, -2, 333);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}simsessionDriverTelemetry/111/n2/333.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(
            getSimsessionDriverTelemetryAsync(111, 0, 333)
        ).resolves.toBeNull();
    });
});

describe('processed telemetry manifest async', () => {
    it('returns an empty Set when no manifest file exists', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        const result = await getProcessedTelemetryManifestAsync(42);
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(0);
    });

    it('returns a Set of subsession ids from the manifest', async () => {
        (readFile as Mock).mockResolvedValue('[10, 20, 30]');
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

describe('getLeagueDriverStats', () => {
    it('reads the per-league driver-stats file', () => {
        (readFileSync as Mock).mockReturnValue('{}');
        expect(getLeagueDriverStats(42)).toEqual({});
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}leagueDriverStats/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getLeagueDriverStats(42)).toBeNull();
    });
});

describe('getLeagueDriverStatsAsync', () => {
    it('reads the per-league driver-stats file', async () => {
        (readFile as Mock).mockResolvedValue('{}');
        await expect(getLeagueDriverStatsAsync(42)).resolves.toEqual({});
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}leagueDriverStats/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getLeagueDriverStatsAsync(42)).resolves.toBeNull();
    });
});

describe('getSingleMemberData', () => {
    it('reads the per-driver member-data file', () => {
        (readFileSync as Mock).mockReturnValue('{"cust_id":12345}');
        expect(getSingleMemberData(12345)).toEqual({ cust_id: 12345 });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}singleMemberData/12345.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getSingleMemberData(12345)).toBeNull();
    });
});

describe('getSingleMemberDataAsync', () => {
    it('reads the per-driver member-data file', async () => {
        (readFile as Mock).mockResolvedValue('{"cust_id":12345}');
        await expect(getSingleMemberDataAsync(12345)).resolves.toEqual({
            cust_id: 12345,
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}singleMemberData/12345.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getSingleMemberDataAsync(12345)).resolves.toBeNull();
    });
});
