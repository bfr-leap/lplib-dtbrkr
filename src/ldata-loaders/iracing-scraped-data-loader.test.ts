import type { Mock } from 'vitest';
vi.mock('fs');
vi.mock('fs/promises');

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import {
    getBlockedSeasons,
    getBlockedSeasonsAsync,
    getLeagueDirectory,
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
    getMembersData,
    getLeagueDirectoryAsync,
    getLeagueSeasonsAsync,
    getLeagueSeasonSessionsAsync,
    getLapChartDataAsync,
    getMembersDataAsync,
} from './iracing-scraped-data-loader';

const MNT = './public/data/ldata-irweb/';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('getLeagueDirectory', () => {
    it('reads and parses leagueDirectory.json', () => {
        (readFileSync as Mock).mockReturnValue('{"leagues":[]}');
        expect(getLeagueDirectory()).toEqual({ leagues: [] });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}leagueDirectory.json`,
            expect.any(Object)
        );
    });

    it('throws if the file is unreadable (no recovery)', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(() => getLeagueDirectory()).toThrow('ENOENT');
    });
});

describe('getLeagueSeasons', () => {
    it('reads the per-league file', () => {
        (readFileSync as Mock).mockReturnValue('{"seasons":[1,2]}');
        expect(getLeagueSeasons(42)).toEqual({ seasons: [1, 2] });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}leagueSeasons/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getLeagueSeasons(42)).toBeNull();
    });
});

describe('getLeagueSeasonSessions', () => {
    it('reads the nested league/season file', () => {
        (readFileSync as Mock).mockReturnValue('{"sessions":[]}');
        expect(getLeagueSeasonSessions(42, 7)).toEqual({ sessions: [] });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}leagueSeasonSessions/42/7.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getLeagueSeasonSessions(42, 7)).toBeNull();
    });
});

describe('getLapChartData', () => {
    it('encodes negative simsession numbers with n prefix', () => {
        (readFileSync as Mock).mockReturnValue('{"chunks":[]}');
        getLapChartData(123, -4);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}lapChartData/123/n4.json`,
            expect.any(Object)
        );
    });

    it('leaves non-negative simsession numbers as-is', () => {
        (readFileSync as Mock).mockReturnValue('{"chunks":[]}');
        getLapChartData(123, 0);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}lapChartData/123/0.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getLapChartData(123, 0)).toBeNull();
    });
});

describe('getMembersData', () => {
    it('reads the nested league/season file', () => {
        (readFileSync as Mock).mockReturnValue('{"members":[]}');
        expect(getMembersData(42, 7)).toEqual({ members: [] });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}membersData/42/7.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getMembersData(42, 7)).toBeNull();
    });
});

describe('getLeagueDirectoryAsync', () => {
    it('reads and parses leagueDirectory.json', async () => {
        (readFile as Mock).mockResolvedValue('{"leagues":[]}');
        await expect(getLeagueDirectoryAsync()).resolves.toEqual({
            leagues: [],
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}leagueDirectory.json`,
            expect.any(Object)
        );
    });

    it('rejects when the file is unreadable (no recovery)', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getLeagueDirectoryAsync()).rejects.toThrow('ENOENT');
    });
});

describe('getLeagueSeasonsAsync', () => {
    it('reads the per-league file', async () => {
        (readFile as Mock).mockResolvedValue('{"seasons":[1,2]}');
        await expect(getLeagueSeasonsAsync(42)).resolves.toEqual({
            seasons: [1, 2],
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}leagueSeasons/42.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getLeagueSeasonsAsync(42)).resolves.toBeNull();
    });
});

describe('getLeagueSeasonSessionsAsync', () => {
    it('reads the nested league/season file', async () => {
        (readFile as Mock).mockResolvedValue('{"sessions":[]}');
        await expect(getLeagueSeasonSessionsAsync(42, 7)).resolves.toEqual({
            sessions: [],
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}leagueSeasonSessions/42/7.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getLeagueSeasonSessionsAsync(42, 7)).resolves.toBeNull();
    });
});

describe('getLapChartDataAsync', () => {
    it('encodes negative simsession numbers with n prefix', async () => {
        (readFile as Mock).mockResolvedValue('{"chunks":[]}');
        await getLapChartDataAsync(123, -4);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}lapChartData/123/n4.json`,
            expect.any(Object)
        );
    });

    it('leaves non-negative simsession numbers as-is', async () => {
        (readFile as Mock).mockResolvedValue('{"chunks":[]}');
        await getLapChartDataAsync(123, 0);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}lapChartData/123/0.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getLapChartDataAsync(123, 0)).resolves.toBeNull();
    });
});

describe('getMembersDataAsync', () => {
    it('reads the nested league/season file', async () => {
        (readFile as Mock).mockResolvedValue('{"members":[]}');
        await expect(getMembersDataAsync(42, 7)).resolves.toEqual({
            members: [],
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}membersData/42/7.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getMembersDataAsync(42, 7)).resolves.toBeNull();
    });
});

describe('getBlockedSeasons', () => {
    it('reads the keyless blockedSeasons.json at the namespace root', () => {
        (readFileSync as Mock).mockReturnValue(
            '{"6555_76693":true,"min_season_id":60000}'
        );
        expect(getBlockedSeasons()).toEqual({
            '6555_76693': true,
            min_season_id: 60000,
        });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}blockedSeasons.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getBlockedSeasons()).toBeNull();
    });

    it('returns null on malformed JSON', () => {
        (readFileSync as Mock).mockReturnValue('not json');
        expect(getBlockedSeasons()).toBeNull();
    });
});

describe('getBlockedSeasonsAsync', () => {
    it('reads the keyless blockedSeasons.json at the namespace root', async () => {
        (readFile as Mock).mockResolvedValue(
            '{"6555_76693":true,"min_season_id":60000}'
        );
        await expect(getBlockedSeasonsAsync()).resolves.toEqual({
            '6555_76693': true,
            min_season_id: 60000,
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}blockedSeasons.json`,
            expect.any(Object)
        );
    });

    it('returns null on read failure', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getBlockedSeasonsAsync()).resolves.toBeNull();
    });

    it('returns null on malformed JSON', async () => {
        (readFile as Mock).mockResolvedValue('not json');
        await expect(getBlockedSeasonsAsync()).resolves.toBeNull();
    });
});
