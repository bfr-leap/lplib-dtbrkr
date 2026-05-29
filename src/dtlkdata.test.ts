jest.mock('./ldata-loaders/iracing-scraped-data-loader', () => ({
    getBlockedSeasonsAsync: jest.fn(),
    getLapChartDataAsync: jest.fn(),
    getLeagueRosterAsync: jest.fn(),
    getLeagueSeasonsAsync: jest.fn(),
    getLeagueSeasonSessionsAsync: jest.fn(),
    getMembersDataAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/iracing-derived-data-loader', () => ({
    getDriverSessionResultsAsync: jest.fn(),
    getLeagueDriverStatsAsync: jest.fn(),
    getLeagueSubsessionIndexAsync: jest.fn(),
    getSimSessionResultsAsync: jest.fn(),
    getSingleMemberDataAsync: jest.fn(),
    getTrackInfoDirectoryAsync: jest.fn(),
    getTrackResultsAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/ldata-stward-data-loader', () => ({
    getStewardRulingsAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/ldata-chart-data-loader', () => ({
    getCumulativeDeltaChartDataAsync: jest.fn(),
    getPacePercentChartDataAsync: jest.fn(),
    getStartFinishChartDataAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/ldata-gentxt-data-loader', () => ({
    getDotdProfileAsync: jest.fn(),
    getSimsessionSummaryAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/ldata-irrpy-data-loader', () => ({
    getTelemetrySubsessionsAsync: jest.fn(),
}));

import { getDocument, getFromLoader, UNHANDLED } from './dtlkdata';
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

beforeEach(() => {
    jest.clearAllMocks();
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

        test('routes singleMemberData to getSingleMemberDataAsync (custId key)', async () => {
            (getSingleMemberDataAsync as jest.Mock).mockResolvedValue({
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
            (getSingleMemberDataAsync as jest.Mock).mockResolvedValue({
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
// getDocument — loader-backed dispatcher
// ---------------------------------------------------------------------------

describe('getDocument', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    test('returns the loader result for a routed namespace/type', async () => {
        const payload = { sessions: [{ subsession_id: 1 }] };
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

    test('returns null when the loader has no data', async () => {
        (getLeagueSeasonsAsync as jest.Mock).mockResolvedValue(null);

        const result = await getDocument({
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        });

        expect(result).toBeNull();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    test('returns null and logs UNHANDLED for an uncatalogued namespace/type', async () => {
        const result = await getDocument({
            namespace: 'ldata-unknown',
            type: 'mystery',
            foo: 'bar',
        });

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const msg = String(warnSpy.mock.calls[0][0]);
        expect(msg).toContain('UNHANDLED');
        expect(msg).toContain('ldata-unknown/mystery');
        expect(msg).toContain('foo=bar');
    });
});
