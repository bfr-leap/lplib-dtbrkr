import type { Mock, MockInstance } from 'vitest';
vi.mock('./ldata-loaders/iracing-scraped-data-loader', () => ({
    getBlockedSeasonsAsync: vi.fn(),
    getLapChartDataAsync: vi.fn(),
    getLeagueRosterAsync: vi.fn(),
    getLeagueSeasonsAsync: vi.fn(),
    getLeagueSeasonSessionsAsync: vi.fn(),
    getMembersDataAsync: vi.fn(),
}));
vi.mock('./ldata-loaders/iracing-derived-data-loader', () => ({
    getDriverSessionResultsAsync: vi.fn(),
    getLeagueDriverStatsAsync: vi.fn(),
    getLeagueSubsessionIndexAsync: vi.fn(),
    getSimSessionResultsAsync: vi.fn(),
    getSingleMemberDataAsync: vi.fn(),
    getTrackInfoDirectoryAsync: vi.fn(),
    getTrackResultsAsync: vi.fn(),
}));
vi.mock('./ldata-loaders/ldata-stward-data-loader', () => ({
    getStewardRulingsAsync: vi.fn(),
}));
vi.mock('./ldata-loaders/ldata-chart-data-loader', () => ({
    getCumulativeDeltaChartDataAsync: vi.fn(),
    getPacePercentChartDataAsync: vi.fn(),
    getStartFinishChartDataAsync: vi.fn(),
}));
vi.mock('./ldata-loaders/ldata-gentxt-data-loader', () => ({
    getDotdProfileAsync: vi.fn(),
    getSimsessionSummaryAsync: vi.fn(),
}));
vi.mock('./ldata-loaders/ldata-irrpy-data-loader', () => ({
    getTelemetrySubsessionsAsync: vi.fn(),
}));

import { getDocument, getFromLoader, getFromUrl, UNHANDLED } from './dtlkdata';
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

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// getFromLoader — the (namespace, type) routing layer
// ---------------------------------------------------------------------------

describe('getFromLoader dispatch', () => {
    describe('ldata-irweb', () => {
        test('routes leagueSeasonSessions to getLeagueSeasonSessionsAsync', async () => {
            (getLeagueSeasonSessionsAsync as Mock).mockResolvedValue({
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
            (getLeagueSeasonsAsync as Mock).mockResolvedValue({
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
            (getMembersDataAsync as Mock).mockResolvedValue({
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
            (getBlockedSeasonsAsync as Mock).mockResolvedValue({
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
            (getLeagueDriverStatsAsync as Mock).mockResolvedValue({});
            await getFromLoader({
                namespace: 'ldata-rsltsts',
                type: 'leagueDriverStats',
                league: 4534,
            });
            expect(getLeagueDriverStatsAsync).toHaveBeenCalledWith(4534);
        });

        test('routes leagueSimsessionIndex to getLeagueSubsessionIndexAsync', async () => {
            (getLeagueSubsessionIndexAsync as Mock).mockResolvedValue([]);
            await getFromLoader({
                namespace: 'ldata-rsltsts',
                type: 'leagueSimsessionIndex',
                league: 4534,
            });
            expect(getLeagueSubsessionIndexAsync).toHaveBeenCalledWith(4534);
        });

        test('routes singleMemberData to getSingleMemberDataAsync (custId key)', async () => {
            (getSingleMemberDataAsync as Mock).mockResolvedValue({
                cust_id: 12345,
            });
            await getFromLoader({
                namespace: 'ldata-rsltsts',
                type: 'singleMemberData',
                custId: 12345,
            });
            expect(getSingleMemberDataAsync).toHaveBeenCalledWith(12345);
        });

        test('singleMemberData also accepts the legacy `driver` alias', async () => {
            (getSingleMemberDataAsync as Mock).mockResolvedValue({
                cust_id: 67890,
            });
            await getFromLoader({
                namespace: 'ldata-rsltsts',
                type: 'singleMemberData',
                driver: 67890,
            });
            expect(getSingleMemberDataAsync).toHaveBeenCalledWith(67890);
        });
    });

    describe('ldata-stward', () => {
        test('routes rulings to getStewardRulingsAsync', async () => {
            (getStewardRulingsAsync as Mock).mockResolvedValue([]);
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
            (getLeagueSeasonSessionsAsync as Mock).mockResolvedValue(null);
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
        test('returns the UNHANDLED sentinel for an unrecognized namespace/type pair', async () => {
            const result = await getFromLoader({
                namespace: 'ldata-unknown',
                type: 'mystery',
            });
            expect(result).toBe(UNHANDLED);
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
    let warnSpy: MockInstance;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    test('returns the URL result when both sources agree', async () => {
        const payload = { sessions: [{ subsession_id: 1 }] };
        mockFetch.mockResolvedValueOnce({ json: async () => payload });
        (getLeagueSeasonSessionsAsync as Mock).mockResolvedValue(payload);

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
        (getLeagueSeasonSessionsAsync as Mock).mockResolvedValue({
            sessions: [{ subsession_id: 2 }],
        });

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasonSessions',
            league: 4534,
            season: 105035,
        });

        // Caller still gets the URL result (PREFER_LOADER=false).
        expect(result).toEqual({ sessions: [{ subsession_id: 1 }] });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const msg = String(warnSpy.mock.calls[0][0]);
        expect(msg).toContain('DIVERGENCE');
        expect(msg).toContain('ldata-irweb/leagueSeasonSessions');
        expect(msg).toContain('shape/value mismatch');
        expect(msg).toContain('returned=url');
    });

    test('returns the URL result when loader returns null', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ seasons: [] }),
        });
        (getLeagueSeasonsAsync as Mock).mockResolvedValue(null);

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        expect(result).toEqual({ seasons: [] });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const msg = String(warnSpy.mock.calls[0][0]);
        expect(msg).toContain('url=non-null loader=null');
        expect(msg).toContain('returned=url');
    });

    test('returns the loader result when URL is null but loader has data', async () => {
        mockFetch.mockRejectedValueOnce(new Error('not found'));
        const loaderPayload = { seasons: [] };
        (getLeagueSeasonsAsync as Mock).mockResolvedValue(loaderPayload);

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        // URL failed → fall back to loader rather than serving null.
        expect(result).toEqual(loaderPayload);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const msg = String(warnSpy.mock.calls[0][0]);
        expect(msg).toContain('url=null loader=non-null');
        expect(msg).toContain('returned=loader');
    });

    test('does not log when both sources return null', async () => {
        mockFetch.mockRejectedValueOnce(new Error('not found'));
        (getLeagueSeasonsAsync as Mock).mockResolvedValue(null);

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
        (getLeagueSeasonsAsync as Mock).mockRejectedValue(
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
        (getLeagueSeasonsAsync as Mock).mockResolvedValue(null);

        await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(getLeagueSeasonsAsync).toHaveBeenCalledTimes(1);
    });

    test('logs UNHANDLED (not DIVERGENCE) for an uncatalogued namespace/type', async () => {
        mockFetch.mockResolvedValueOnce({ json: async () => ({ data: 1 }) });

        const result = await getDocument({
            namespace: 'ldata-unknown',
            type: 'mystery',
            foo: 'bar',
        });

        expect(result).toEqual({ data: 1 });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const msg = String(warnSpy.mock.calls[0][0]);
        expect(msg).toContain('UNHANDLED');
        expect(msg).not.toContain('DIVERGENCE');
        expect(msg).toContain('ldata-unknown/mystery');
        expect(msg).toContain('foo=bar');
    });
});
