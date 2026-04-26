import { getMostRecentActiveSeason, getAllSeasonIdsForLeague } from './seasons';
import { sql } from './db';

describe('seasons - getMostRecentActiveSeason', () => {
    const testLeagueId = 9990001;

    afterEach(async () => {
        await sql`DELETE FROM seasons WHERE league_id = ${testLeagueId}`;
    });

    test('returns null when league has no seasons at all', async () => {
        const result = await getMostRecentActiveSeason(String(testLeagueId));
        expect(result).toBeNull();
    });

    test('returns null when league has only inactive seasons', async () => {
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${500}, ${testLeagueId}, ${'S500'}, ${1}, ${0})`;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${501}, ${testLeagueId}, ${'S501'}, ${1}, ${0})`;

        const result = await getMostRecentActiveSeason(String(testLeagueId));
        expect(result).toBeNull();
    });

    test('returns the highest season_id among active seasons', async () => {
        // Inactive but newest: should be ignored
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${999}, ${testLeagueId}, ${'S999-inactive'}, ${1}, ${0})`;
        // Active older
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${100}, ${testLeagueId}, ${'S100'}, ${1}, ${1})`;
        // Active newer
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${200}, ${testLeagueId}, ${'S200'}, ${1}, ${1})`;
        // Active middle
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${150}, ${testLeagueId}, ${'S150'}, ${1}, ${1})`;

        const result = await getMostRecentActiveSeason(String(testLeagueId));
        expect(result).toBe(200);
    });

    test('scopes lookup to the given league', async () => {
        const otherLeague = 9990002;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${50}, ${testLeagueId}, ${'ours'}, ${1}, ${1})`;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${9999}, ${otherLeague}, ${'theirs'}, ${1}, ${1})`;

        try {
            const result = await getMostRecentActiveSeason(String(testLeagueId));
            expect(result).toBe(50);
        } finally {
            await sql`DELETE FROM seasons WHERE league_id = ${otherLeague}`;
        }
    });
});

describe('seasons - getAllSeasonIdsForLeague', () => {
    const testLeagueId = 9990101;

    afterEach(async () => {
        await sql`DELETE FROM seasons WHERE league_id = ${testLeagueId}`;
    });

    test('returns empty array when league has no seasons', async () => {
        const result = await getAllSeasonIdsForLeague(String(testLeagueId));
        expect(result).toEqual([]);
    });

    test('returns both active and inactive season_ids', async () => {
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${100}, ${testLeagueId}, ${'S100'}, ${1}, ${1})`;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${200}, ${testLeagueId}, ${'S200-inactive'}, ${1}, ${0})`;

        const result = await getAllSeasonIdsForLeague(String(testLeagueId));
        expect(result.sort()).toEqual([100, 200]);
    });

    test('de-duplicates repeated season_ids', async () => {
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${500}, ${testLeagueId}, ${'S500-a'}, ${1}, ${1})`;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${500}, ${testLeagueId}, ${'S500-b'}, ${2}, ${0})`;

        const result = await getAllSeasonIdsForLeague(String(testLeagueId));
        expect(result).toEqual([500]);
    });

    test('orders results newest-first', async () => {
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${100}, ${testLeagueId}, ${'S100'}, ${1}, ${1})`;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${300}, ${testLeagueId}, ${'S300'}, ${1}, ${1})`;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${200}, ${testLeagueId}, ${'S200'}, ${1}, ${1})`;

        const result = await getAllSeasonIdsForLeague(String(testLeagueId));
        expect(result).toEqual([300, 200, 100]);
    });

    test('scopes lookup to the given league', async () => {
        const otherLeague = 9990102;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${10}, ${testLeagueId}, ${'ours'}, ${1}, ${1})`;
        await sql`
            INSERT INTO seasons (season_id, league_id, display_name, car_id, is_active)
            VALUES (${9999}, ${otherLeague}, ${'theirs'}, ${1}, ${1})`;

        try {
            const result = await getAllSeasonIdsForLeague(String(testLeagueId));
            expect(result).toEqual([10]);
        } finally {
            await sql`DELETE FROM seasons WHERE league_id = ${otherLeague}`;
        }
    });
});
