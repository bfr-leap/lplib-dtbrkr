jest.mock('./ldata-loaders/iracing-scraped-data-loader', () => ({
    getBlockedSeasonsAsync: jest.fn(),
    getLeagueSeasonsAsync: jest.fn(),
    getLeagueSeasonSessionsAsync: jest.fn(),
    getMembersDataAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/iracing-derived-data-loader', () => ({
    getLeagueDriverStatsAsync: jest.fn(),
    getLeagueSubsessionIndexAsync: jest.fn(),
    getSingleMemberDataAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/ldata-stward-data-loader', () => ({
    getStewardRulingsAsync: jest.fn(),
}));

import { getDocument, getFromLoader, getFromUrl } from './dtlkdata';
import {
    getBlockedSeasonsAsync,
    getLeagueSeasonsAsync,
    getLeagueSeasonSessionsAsync,
    getMembersDataAsync,
} from './ldata-loaders/iracing-scraped-data-loader';
import {
    getLeagueDriverStatsAsync,
    getLeagueSubsessionIndexAsync,
    getSingleMemberDataAsync,
} from './ldata-loaders/iracing-derived-data-loader';
import { getStewardRulingsAsync } from './ldata-loaders/ldata-stward-data-loader';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// getFromLoader — the (namespace, type) routing layer
// ---------------------------------------------------------------------------

describe('getFromLoader dispatch', () => {
    describe('ldata-irweb', () => {
        test('routes leagueSeasonSessions to getLeagueSeasonSessionsAsync', async () => {
            (getLeagueSeasonSessionsAsync as jest.Mock).mockResolvedValue({
                sessions: [],
            });
            const result = await getFromLoader({
                namespace: 'ldata-irweb',
                type: 'leagueSeasonSessions',
                league: 4534,
                season: 105035,
            });
            expect(getLeagueSeasonSessionsAsync).toHaveBeenCalledWith(
                4534,
                105035
            );
            expect(result).toEqual({ sessions: [] });
        });

        test('routes leagueSeasons to getLeagueSeasonsAsync', async () => {
            (getLeagueSeasonsAsync as jest.Mock).mockResolvedValue({
                seasons: [],
            });
            await getFromLoader({
                namespace: 'ldata-irweb',
                type: 'leagueSeasons',
                league: 4534,
            });
            expect(getLeagueSeasonsAsync).toHaveBeenCalledWith(4534);
        });

        test('routes membersData to getMembersDataAsync', async () => {
            (getMembersDataAsync as jest.Mock).mockResolvedValue({
                members: [],
            });
            await getFromLoader({
                namespace: 'ldata-irweb',
                type: 'membersData',
                league: 4534,
                season: 105035,
            });
            expect(getMembersDataAsync).toHaveBeenCalledWith(4534, 105035);
        });

        test('routes blockedSeasons to getBlockedSeasonsAsync (no key args)', async () => {
            (getBlockedSeasonsAsync as jest.Mock).mockResolvedValue({
                '6555_76693': true,
                min_season_id: 60000,
            });
            const result = await getFromLoader({
                namespace: 'ldata-irweb',
                type: 'blockedSeasons',
            });
            expect(getBlockedSeasonsAsync).toHaveBeenCalledWith();
            expect(result).toEqual({
                '6555_76693': true,
                min_season_id: 60000,
            });
        });
    });

    describe('ldata-rsltsts', () => {
        test('routes leagueDriverStats to getLeagueDriverStatsAsync', async () => {
            (getLeagueDriverStatsAsync as jest.Mock).mockResolvedValue({});
            await getFromLoader({
                namespace: 'ldata-rsltsts',
                type: 'leagueDriverStats',
                league: 4534,
            });
            expect(getLeagueDriverStatsAsync).toHaveBeenCalledWith(4534);
        });

        test('routes leagueSimsessionIndex to getLeagueSubsessionIndexAsync', async () => {
            (getLeagueSubsessionIndexAsync as jest.Mock).mockResolvedValue([]);
            await getFromLoader({
                namespace: 'ldata-rsltsts',
                type: 'leagueSimsessionIndex',
                league: 4534,
            });
            expect(getLeagueSubsessionIndexAsync).toHaveBeenCalledWith(4534);
        });

        test('routes singleMemberData to getSingleMemberDataAsync (driver key)', async () => {
            (getSingleMemberDataAsync as jest.Mock).mockResolvedValue({
                cust_id: 12345,
            });
            await getFromLoader({
                namespace: 'ldata-rsltsts',
                type: 'singleMemberData',
                driver: 12345,
            });
            expect(getSingleMemberDataAsync).toHaveBeenCalledWith(12345);
        });
    });

    describe('ldata-stward', () => {
        test('routes rulings to getStewardRulingsAsync', async () => {
            (getStewardRulingsAsync as jest.Mock).mockResolvedValue([]);
            await getFromLoader({
                namespace: 'ldata-stward',
                type: 'rulings',
                league: 6555,
                season: 99410,
            });
            expect(getStewardRulingsAsync).toHaveBeenCalledWith(6555, 99410);
        });
    });

    describe('key coercion', () => {
        test('coerces string keys to numbers before calling loaders', async () => {
            (getLeagueSeasonSessionsAsync as jest.Mock).mockResolvedValue(null);
            await getFromLoader({
                namespace: 'ldata-irweb',
                type: 'leagueSeasonSessions',
                league: '4534',
                season: '105035',
            });
            expect(getLeagueSeasonSessionsAsync).toHaveBeenCalledWith(
                4534,
                105035
            );
        });

        test('returns null when a required key is missing', async () => {
            const result = await getFromLoader({
                namespace: 'ldata-irweb',
                type: 'leagueSeasonSessions',
                league: 4534,
            });
            expect(result).toBeNull();
            expect(getLeagueSeasonSessionsAsync).not.toHaveBeenCalled();
        });

        test('returns null when a key is non-numeric', async () => {
            const result = await getFromLoader({
                namespace: 'ldata-irweb',
                type: 'leagueSeasonSessions',
                league: 'not-a-number',
                season: 105035,
            });
            expect(result).toBeNull();
            expect(getLeagueSeasonSessionsAsync).not.toHaveBeenCalled();
        });

        test('returns null when a key is the empty string', async () => {
            const result = await getFromLoader({
                namespace: 'ldata-irweb',
                type: 'leagueSeasonSessions',
                league: '',
                season: 105035,
            });
            expect(result).toBeNull();
            expect(getLeagueSeasonSessionsAsync).not.toHaveBeenCalled();
        });
    });

    describe('unknown namespace/type', () => {
        test('returns null for an unrecognized namespace/type pair', async () => {
            const result = await getFromLoader({
                namespace: 'ldata-unknown',
                type: 'mystery',
            });
            expect(result).toBeNull();
        });
    });
});

// ---------------------------------------------------------------------------
// getFromUrl — the legacy URL fetch (preserved during shadow-mode rollout)
// ---------------------------------------------------------------------------

describe('getFromUrl', () => {
    test('builds the expected URL and returns parsed JSON', async () => {
        const fakeData = { foo: 'bar' };
        mockFetch.mockResolvedValueOnce({ json: async () => fakeData });

        const result = await getFromUrl({
            namespace: 'ldata-irweb',
            type: 'leagueSeasonSessions',
            league: 4534,
            season: 105035,
        });

        expect(result).toEqual(fakeData);
        const url = mockFetch.mock.calls[0][0] as string;
        expect(url).toBe(
            'https://arturo-mayorga.github.io/irl_stats/dist/data/ldata-irweb/leagueSeasonSessions/4534/105035.json'
        );
    });

    test('encodes negative simsession values with n-prefix', async () => {
        mockFetch.mockResolvedValueOnce({ json: async () => ({}) });
        await getFromUrl({ namespace: 'ns', type: 'type', simsession: -1 });
        const url = mockFetch.mock.calls[0][0] as string;
        expect(url).toContain('/n1');
    });

    test('returns null when fetch throws', async () => {
        mockFetch.mockRejectedValueOnce(new Error('network error'));
        const result = await getFromUrl({ namespace: 'ns', type: 'type' });
        expect(result).toBeNull();
    });

    test('returns null when JSON parsing fails', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => {
                throw new Error('invalid json');
            },
        });
        const result = await getFromUrl({ namespace: 'ns', type: 'type' });
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// getDocument — shadow-mode dispatcher
// ---------------------------------------------------------------------------

describe('getDocument shadow-mode', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    test('returns the URL result when both sources agree', async () => {
        const payload = { sessions: [{ subsession_id: 1 }] };
        mockFetch.mockResolvedValueOnce({ json: async () => payload });
        (getLeagueSeasonSessionsAsync as jest.Mock).mockResolvedValue(payload);

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasonSessions',
            league: 4534,
            season: 105035,
        });

        expect(result).toEqual(payload);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    test('returns the URL result and logs divergence on shape mismatch', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ sessions: [{ subsession_id: 1 }] }),
        });
        (getLeagueSeasonSessionsAsync as jest.Mock).mockResolvedValue({
            sessions: [{ subsession_id: 2 }],
        });

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasonSessions',
            league: 4534,
            season: 105035,
        });

        // Caller still gets the URL result.
        expect(result).toEqual({ sessions: [{ subsession_id: 1 }] });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const msg = String(warnSpy.mock.calls[0][0]);
        expect(msg).toContain('DIVERGENCE');
        expect(msg).toContain('ldata-irweb/leagueSeasonSessions');
        expect(msg).toContain('shape/value mismatch');
    });

    test('logs divergence when URL has data but loader returns null', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ seasons: [] }),
        });
        (getLeagueSeasonsAsync as jest.Mock).mockResolvedValue(null);

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        expect(result).toEqual({ seasons: [] });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(String(warnSpy.mock.calls[0][0])).toContain(
            'url=non-null loader=null'
        );
    });

    test('logs divergence when loader has data but URL returns null', async () => {
        mockFetch.mockRejectedValueOnce(new Error('not found'));
        (getLeagueSeasonsAsync as jest.Mock).mockResolvedValue({ seasons: [] });

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        // URL failed → null returned, even though loader had data.
        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(String(warnSpy.mock.calls[0][0])).toContain(
            'url=null loader=non-null'
        );
    });

    test('does not log when both sources return null', async () => {
        mockFetch.mockRejectedValueOnce(new Error('not found'));
        (getLeagueSeasonsAsync as jest.Mock).mockResolvedValue(null);

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        expect(result).toBeNull();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    test('loader-side exceptions never affect what the caller receives', async () => {
        const payload = { seasons: [{ season_id: 1 }] };
        mockFetch.mockResolvedValueOnce({ json: async () => payload });
        (getLeagueSeasonsAsync as jest.Mock).mockRejectedValue(
            new Error('disk on fire')
        );

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        expect(result).toEqual(payload);
        // Loader threw → treated as null → divergence vs the URL payload.
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test('runs URL and loader in parallel (both invoked)', async () => {
        mockFetch.mockResolvedValueOnce({ json: async () => null });
        (getLeagueSeasonsAsync as jest.Mock).mockResolvedValue(null);

        await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(getLeagueSeasonsAsync).toHaveBeenCalledTimes(1);
    });
});
