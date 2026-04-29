import {
    getDefaultLeagueSeason,
    getIrLinkState,
    updIrLinkDriver,
    updIrLinkCode,
    userDataHandler,
} from './usrdata';
import { sql, getDb } from './db';

// Mock dtlkdata since defLgSeasSubCtx calls it internally
vi.mock('./dtlkdata', () => ({
    getDocument: vi.fn(async (query: any) => {
        if (query.type === 'leagueSeasonSessions') {
            return {
                sessions: [
                    { subsession_id: 8001 },
                    { subsession_id: 8002 },
                ],
            };
        }
        return null;
    }),
}));

describe('usrdata', () => {
    describe('getIrLinkState', () => {
        test('returns default state for a user with no mapping', async () => {
            const result = await getIrLinkState('nonexistent_user_xyz');
            expect(result).toEqual({ isVerified: false, irCustId: '', msgSent: false });
        });

        test('returns populated state after linking a driver', async () => {
            const userId = 'test_irl_state_user';
            await updIrLinkDriver(userId, '54321');

            const result = await getIrLinkState(userId);
            expect(result.irCustId).toBe('54321');
            expect(result.isVerified).toBe(false);
            expect(result.msgSent).toBe(false);

            // cleanup
            getDb().prepare(`DELETE FROM user_ir_cust_mappings WHERE user_id = ?`).run(userId);
        });
    });

    describe('updIrLinkDriver', () => {
        test('creates a new ir cust mapping', async () => {
            const userId = 'test_upd_driver_user';
            await updIrLinkDriver(userId, '11111');

            const state = await getIrLinkState(userId);
            expect(state.irCustId).toBe('11111');
            expect(state.isVerified).toBe(false);

            // cleanup
            getDb().prepare(`DELETE FROM user_ir_cust_mappings WHERE user_id = ?`).run(userId);
        });

        test('replaces existing mapping and increments try_count', async () => {
            const userId = 'test_upd_driver_retry_user';
            await updIrLinkDriver(userId, '11111');
            await updIrLinkDriver(userId, '22222');

            const state = await getIrLinkState(userId);
            expect(state.irCustId).toBe('22222');

            const { records } = await sql`SELECT try_count FROM user_ir_cust_mappings WHERE user_id = ${userId}`;
            expect((records[0] as any).try_count).toBe(1);

            // cleanup
            getDb().prepare(`DELETE FROM user_ir_cust_mappings WHERE user_id = ?`).run(userId);
        });
    });

    describe('updIrLinkCode', () => {
        test('marks as verified when correct code is provided', async () => {
            const userId = 'test_code_correct_user';
            await updIrLinkDriver(userId, '33333');

            const { records } = await sql`SELECT verify_code FROM user_ir_cust_mappings WHERE user_id = ${userId}`;
            const correctCode = String((records[0] as any).verify_code);

            await updIrLinkCode(userId, correctCode);
            const state = await getIrLinkState(userId);
            expect(state.isVerified).toBe(true);

            // cleanup
            getDb().prepare(`DELETE FROM user_ir_cust_mappings WHERE user_id = ?`).run(userId);
        });

        test('does not verify when wrong code is provided', async () => {
            const userId = 'test_code_wrong_user';
            await updIrLinkDriver(userId, '44444');

            await updIrLinkCode(userId, '000000');
            const state = await getIrLinkState(userId);
            expect(state.isVerified).toBe(false);

            // cleanup
            getDb().prepare(`DELETE FROM user_ir_cust_mappings WHERE user_id = ?`).run(userId);
        });

        test('does nothing when user has no mapping', async () => {
            await expect(updIrLinkCode('no_such_user_xyz', '123456')).resolves.toEqual({});
        });
    });

    describe('getDefaultLeagueSeason', () => {
        test('returns default when user has no league interest', async () => {
            const result = await getDefaultLeagueSeason('user_with_no_leagues');
            expect(result).toEqual({ league_id: 6555, season_id: 99410 });
        });

        test('returns upcoming season for user with league interest', async () => {
            const userId = 'test_default_season_user';
            // Insert league interest for league 4534 which has a future event in 2124
            await sql`INSERT INTO users_leagues_interest (user_id, league_id) VALUES (${userId}, ${4534})`;

            const result = await getDefaultLeagueSeason(userId);
            expect(result).toBeDefined();
            expect(result.league_id).toBe(4534);
            expect(result.season_id).toBeDefined();

            // cleanup
            getDb().prepare(`DELETE FROM users_leagues_interest WHERE user_id = ?`).run(userId);
        });
    });

    describe('userDataHandler', () => {
        test('returns irLinkState for irLinkState type', async () => {
            const result = await userDataHandler('ldata-usrdata', {
                type: 'irLinkState',
                userID: 'nonexistent_handler_user',
            });
            expect(result).toEqual({ isVerified: false, irCustId: '', msgSent: false });
        });

        test('returns userFeatures for userFeatures type', async () => {
            const result = await userDataHandler('ldata-usrdata', {
                type: 'userFeatures',
                userID: 'user_unlisted',
            });
            expect(Array.isArray(result)).toBe(true);
            expect(result).toContain('fully_released_feature');
        });

        test('returns userLeagues for userLeagues type', async () => {
            const result = await userDataHandler('ldata-usrdata', {
                type: 'userLeagues',
                userID: 'user_with_no_leagues_at_all',
            });
            expect(Array.isArray(result) || typeof result === 'object').toBe(true);
        });

        // userLeaguesUpd uses a VALUES-as-derived-table SQL syntax not supported in SQLite 3.45
        test.skip('updates and retrieves user leagues for userLeaguesUpd type', async () => {
            const userId = 'test_leagues_upd_user';

            const result = await userDataHandler('ldata-usrdata', {
                type: 'userLeaguesUpd',
                userID: userId,
                code: '4534',
            });

            expect(Array.isArray(result)).toBe(true);
            const leagueIds = result.map((r: any) => r.league_id);
            expect(leagueIds).toContain(4534);

            // cleanup
            getDb().prepare(`DELETE FROM users_leagues_interest WHERE user_id = ?`).run(userId);
        });

        test('returns defaultLeagueSeason for defaultLeagueSeason type', async () => {
            const result = await userDataHandler('ldata-usrdata', {
                type: 'defaultLeagueSeason',
                userID: 'no_leagues_user_handler',
            });
            expect(result).toBeDefined();
            expect(result.league_id).toBeDefined();
            expect(result.season_id).toBeDefined();
        });

        test('handles irLinkDriverUpd type', async () => {
            const userId = 'test_handler_driver_user';
            const result = await userDataHandler('ldata-usrdata', {
                type: 'irLinkDriverUpd',
                userID: userId,
                driver: '99888',
            });
            expect(result).toEqual({});

            // cleanup
            getDb().prepare(`DELETE FROM user_ir_cust_mappings WHERE user_id = ?`).run(userId);
        });

        test('handles irLinkCodeUpd type', async () => {
            const userId = 'test_handler_code_user';
            await updIrLinkDriver(userId, '77777');

            const result = await userDataHandler('ldata-usrdata', {
                type: 'irLinkCodeUpd',
                userID: userId,
                code: '000000',
            });
            expect(result).toEqual({});

            // cleanup
            getDb().prepare(`DELETE FROM user_ir_cust_mappings WHERE user_id = ?`).run(userId);
        });

        test('returns null for unknown type', async () => {
            const result = await userDataHandler('ldata-usrdata', {
                type: 'unknownType',
                userID: 'any_user',
            });
            expect(result).toBeNull();
        });

        test('handles defLgSeasSubCtx type', async () => {
            const result = await userDataHandler('ldata-usrdata', {
                type: 'defLgSeasSubCtx',
                userID: 'any_user',
                league: '',
                season: '',
                subsession: '',
            });
            // Should return an object (may be empty if no data matches)
            expect(typeof result === 'object').toBe(true);
        });

        test('defLgSeasSubCtx returns exact subsession_id at index 0 in sessions array', async () => {
            // 8001 is the first element (index 0) in the mocked sessions array.
            // This test guards against an off-by-one bug where indexOf() > 0
            // would incorrectly reject the subsession at index 0.
            const result = await userDataHandler('ldata-usrdata', {
                type: 'defLgSeasSubCtx',
                userID: 'any_user',
                league: '4534',
                season: '105035',
                subsession: '8001',
            });

            expect(result).toBeDefined();
            expect(result.subsession_id).toBe(8001);
        });

        test('defLgSeasSubCtx returns exact subsession_id at a non-zero index', async () => {
            const result = await userDataHandler('ldata-usrdata', {
                type: 'defLgSeasSubCtx',
                userID: 'any_user',
                league: '4534',
                season: '105035',
                subsession: '8002',
            });

            expect(result).toBeDefined();
            expect(result.subsession_id).toBe(8002);
        });

        test('defLgSeasSubCtx falls back when subsession is not in sessions array', async () => {
            const result = await userDataHandler('ldata-usrdata', {
                type: 'defLgSeasSubCtx',
                userID: 'any_user',
                league: '4534',
                season: '105035',
                subsession: '99999',
            });

            expect(result).toBeDefined();
            // Should fall back — subsession_id will NOT be 99999
            expect(result.subsession_id).not.toBe(99999);
        });
    });
});
