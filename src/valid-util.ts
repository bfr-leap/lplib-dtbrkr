import { getDocument as getDataLakeDocument } from './dtlkdata';
import { sql } from './db';

export async function isValidSeason(league: string, season: string): Promise<number> {

    console.log('isValidSeason()');
    const season_id = Number.parseInt(season, 10);
    if (isNaN(season_id)) {
        console.log(`invalid season [NaN] ${season_id}`);
        return 0;
    }

    const { records } = await sql`
        SELECT "league_id"
        FROM "seasons"
        WHERE "season_id"=${season_id}`;

    let ret = records.length > 0 ? (<any>records)[0].league_id : 0;
    if (!ret) {
        const league_id = Number.parseInt(league, 10);

        const dlDoc = await getDataLakeDocument({
            namespace: `ldata-irweb`,
            type: `leagueSeasonSessions`,
            league: league_id,
            season: season_id,
        });

        // we were able to find the season-sessions
        // from the dataLake, this means it's valid
        ret = (dlDoc) ? season_id : 0;
    }

    return ret;
}

export async function isValidLeague(league: string): Promise<boolean> {
    const league_id = Number.parseInt(league, 10);
    if (isNaN(league_id)) {
        return false;
    }

    const { records } = await sql`
        SELECT "season_id"
        FROM "seasons"
        WHERE "league_id"=${league_id}`;

    return records.length > 0;
}
