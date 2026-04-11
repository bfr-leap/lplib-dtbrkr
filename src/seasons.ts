import { sql } from './db';

/**
 * Returns the highest `season_id` of any active season for the given league,
 * or `null` when the league has no active seasons.
 *
 * The `seasons.league_id` column is INTEGER in the underlying schema, but
 * this function accepts a string for consistency with other broker APIs —
 * SQLite coerces the parameter at query time.
 */
export async function getMostRecentActiveSeason(
    leagueId: string
): Promise<number | null> {
    console.log('::: getMostRecentActiveSeason():', leagueId);
    const { records } = await sql`
        SELECT season_id FROM seasons
        WHERE league_id = ${leagueId} AND is_active = 1
        ORDER BY season_id DESC
        LIMIT 1`;

    const rec = records[0] as any;
    if (!rec || rec.season_id == null) return null;
    return Number(rec.season_id);
}
