jest.mock('./dtlkdata', () => ({
    getDocument: jest.fn(async (query: any) => {
        if (query.type === 'leagueSeasonSessions') {
            return {
                sessions: [
                    { subsession_id: 9001 },
                    { subsession_id: 9002 },
                    { subsession_id: 9003 },
                ],
            };
        }
        return null;
    }),
}));

import { userConfigHandler } from './usrcfg';

describe('userConfigHandler', () => {
    describe('leagueTeamsInfo', () => {
        test('returns teams info for a valid league', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'leagueTeamsInfo',
                league: '637',
            });

            expect(result).toBeDefined();
            expect(typeof result.leageu_id).toBe('number');
            expect(result.leageu_id).toBe(637);
            expect(Array.isArray(result.seasons)).toBe(true);
            expect(result.seasons.length).toBeGreaterThan(0);

            const season = result.seasons[0];
            expect(Array.isArray(season.teams)).toBe(true);
            expect(season.teams.length).toBeGreaterThan(0);

            const team = season.teams[0];
            expect(typeof team.team_name).toBe('string');
            expect(Array.isArray(team.team_members)).toBe(true);
        });

        test('returns empty seasons for a league with no teams', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'leagueTeamsInfo',
                league: '99999',
            });

            expect(result).toBeDefined();
            expect(result.seasons).toEqual([]);
        });
    });

    describe('activeLeagueSchedule', () => {
        test('returns active league schedule with leagues', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'activeLeagueSchedule',
            });

            expect(result).toBeDefined();
            expect(Array.isArray(result.leagues)).toBe(true);
            expect(result.leagues.length).toBeGreaterThan(0);

            const league = result.leagues[0];
            expect(typeof league.league_id).toBe('number');
            expect(Array.isArray(league.seasons)).toBe(true);
        });
    });

    describe('trackDisplayInfo', () => {
        test('returns a map of track_id to display info', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'trackDisplayInfo',
            });

            expect(result).toBeDefined();
            expect(typeof result).toBe('object');

            // Check a known track from the seeded data
            const trackIds = Object.keys(result);
            expect(trackIds.length).toBeGreaterThan(0);

            const firstTrack = result[trackIds[0]];
            expect(typeof firstTrack.display).toBe('string');
            expect(typeof firstTrack.short_display).toBe('string');
        });
    });

    describe('defLgSeasSubCtx', () => {
        test('returns context with league, season, subsession when league is provided', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'defLgSeasSubCtx',
                league: '4534',
                season: '',
                subsession: '',
            });

            expect(result).toBeDefined();
            expect(result.league_id).toBeDefined();
            expect(result.season_id).toBeDefined();
            expect(result.subsession_id).toBeDefined();
        });

        test('returns context when season is provided', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'defLgSeasSubCtx',
                league: '4534',
                season: '105035',
                subsession: '',
            });

            expect(result).toBeDefined();
            expect(result.league_id).toBeDefined();
            expect(result.season_id).toBeDefined();
        });

        test('returns context when subsession is provided', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'defLgSeasSubCtx',
                league: '4534',
                season: '105035',
                subsession: '9001',
            });

            expect(result).toBeDefined();
            expect(result.league_id).toBeDefined();
            expect(result.season_id).toBeDefined();
        });

        test('returns the exact subsession_id when it is at index 0 in sessions array', async () => {
            // 9001 is the first element (index 0) in the mocked sessions array.
            // This test guards against an off-by-one bug where indexOf() > 0
            // would incorrectly reject the subsession at index 0.
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'defLgSeasSubCtx',
                league: '4534',
                season: '105035',
                subsession: '9001',
            });

            expect(result).toBeDefined();
            expect(result.subsession_id).toBe(9001);
        });

        test('returns the exact subsession_id when it is at a non-zero index', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'defLgSeasSubCtx',
                league: '4534',
                season: '105035',
                subsession: '9002',
            });

            expect(result).toBeDefined();
            expect(result.subsession_id).toBe(9002);
        });

        test('falls back when subsession is not in the sessions array', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'defLgSeasSubCtx',
                league: '4534',
                season: '105035',
                subsession: '99999',
            });

            expect(result).toBeDefined();
            // Should fall back to defLgSeasSubCtx_forSeason, so subsession_id
            // will NOT be 99999 — it will be resolved from the data lake doc
            expect(result.subsession_id).not.toBe(99999);
        });

        test('returns context with no params (empty strings)', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'defLgSeasSubCtx',
                league: '',
                season: '',
                subsession: '',
            });

            expect(result).toBeDefined();
        });
    });

    describe('unknown type', () => {
        test('returns null for unknown query type', async () => {
            const result = await userConfigHandler('ldata-usrcfg', {
                type: 'unknownType',
            });

            expect(result).toBeNull();
        });
    });
});
