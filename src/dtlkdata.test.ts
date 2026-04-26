jest.mock('./ldata-loaders/iracing-scraped-data-loader', () => ({
    getLeagueSeasonsAsync: jest.fn(),
    getLeagueSeasonSessionsAsync: jest.fn(),
    getMembersDataAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/iracing-derived-data-loader', () => ({
    getLeagueDriverStatsAsync: jest.fn(),
    getSingleMemberDataAsync: jest.fn(),
}));
jest.mock('./ldata-loaders/ldata-stward-data-loader', () => ({
    getStewardRulingsAsync: jest.fn(),
}));

import { getDocument } from './dtlkdata';
import {
    getLeagueSeasonsAsync,
    getLeagueSeasonSessionsAsync,
    getMembersDataAsync,
} from './ldata-loaders/iracing-scraped-data-loader';
import {
    getLeagueDriverStatsAsync,
    getSingleMemberDataAsync,
} from './ldata-loaders/iracing-derived-data-loader';
import { getStewardRulingsAsync } from './ldata-loaders/ldata-stward-data-loader';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('dtlkdata.getDocument dispatcher', () => {
    describe('ldata-irweb', () => {
        test('routes leagueSeasonSessions to getLeagueSeasonSessionsAsync', async () => {
            (getLeagueSeasonSessionsAsync as jest.Mock).mockResolvedValue({
                sessions: [],
            });
            const result = await getDocument({
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
            const result = await getDocument({
                namespace: 'ldata-irweb',
                type: 'leagueSeasons',
                league: 4534,
            });
            expect(getLeagueSeasonsAsync).toHaveBeenCalledWith(4534);
            expect(result).toEqual({ seasons: [] });
        });

        test('routes membersData to getMembersDataAsync', async () => {
            (getMembersDataAsync as jest.Mock).mockResolvedValue({
                members: [],
            });
            const result = await getDocument({
                namespace: 'ldata-irweb',
                type: 'membersData',
                league: 4534,
                season: 105035,
            });
            expect(getMembersDataAsync).toHaveBeenCalledWith(4534, 105035);
            expect(result).toEqual({ members: [] });
        });
    });

    describe('ldata-rsltsts', () => {
        test('routes leagueDriverStats to getLeagueDriverStatsAsync', async () => {
            (getLeagueDriverStatsAsync as jest.Mock).mockResolvedValue({});
            await getDocument({
                namespace: 'ldata-rsltsts',
                type: 'leagueDriverStats',
                league: 4534,
            });
            expect(getLeagueDriverStatsAsync).toHaveBeenCalledWith(4534);
        });

        test('routes singleMemberData to getSingleMemberDataAsync (driver key)', async () => {
            (getSingleMemberDataAsync as jest.Mock).mockResolvedValue({
                cust_id: 12345,
            });
            const result = await getDocument({
                namespace: 'ldata-rsltsts',
                type: 'singleMemberData',
                driver: 12345,
            });
            expect(getSingleMemberDataAsync).toHaveBeenCalledWith(12345);
            expect(result).toEqual({ cust_id: 12345 });
        });
    });

    describe('ldata-stward', () => {
        test('routes rulings to getStewardRulingsAsync', async () => {
            (getStewardRulingsAsync as jest.Mock).mockResolvedValue([]);
            await getDocument({
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
            await getDocument({
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
            const result = await getDocument({
                namespace: 'ldata-irweb',
                type: 'leagueSeasonSessions',
                league: 4534,
            });
            expect(result).toBeNull();
            expect(getLeagueSeasonSessionsAsync).not.toHaveBeenCalled();
        });

        test('returns null when a key is non-numeric', async () => {
            const result = await getDocument({
                namespace: 'ldata-irweb',
                type: 'leagueSeasonSessions',
                league: 'not-a-number',
                season: 105035,
            });
            expect(result).toBeNull();
            expect(getLeagueSeasonSessionsAsync).not.toHaveBeenCalled();
        });

        test('returns null when a key is the empty string', async () => {
            const result = await getDocument({
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
            const result = await getDocument({
                namespace: 'ldata-unknown',
                type: 'mystery',
            });
            expect(result).toBeNull();
        });

        test('does not call any loader when nothing matches', async () => {
            await getDocument({ namespace: 'foo', type: 'bar' });
            expect(getLeagueSeasonSessionsAsync).not.toHaveBeenCalled();
            expect(getLeagueSeasonsAsync).not.toHaveBeenCalled();
            expect(getMembersDataAsync).not.toHaveBeenCalled();
            expect(getLeagueDriverStatsAsync).not.toHaveBeenCalled();
            expect(getSingleMemberDataAsync).not.toHaveBeenCalled();
            expect(getStewardRulingsAsync).not.toHaveBeenCalled();
        });
    });

    describe('null-on-failure passthrough', () => {
        test('returns whatever the loader returns, including null', async () => {
            (getLeagueSeasonsAsync as jest.Mock).mockResolvedValue(null);
            const result = await getDocument({
                namespace: 'ldata-irweb',
                type: 'leagueSeasons',
                league: 4534,
            });
            expect(result).toBeNull();
        });
    });
});
