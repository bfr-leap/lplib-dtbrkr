import { StewardRuling, StewardConfig } from 'ir-endpoint-types';
import { getDocument as getDataLakeDocument } from './dtlkdata';
import { sql } from './db';

// ---------------------------------------------------------------------------
// Data-lake accessors (ldata-stward)
// ---------------------------------------------------------------------------
//
// `ldata-stward` stores the steward ruling records produced by the stewarding
// workflow. Rulings are partitioned per-league / per-season on disk; all
// filtering below happens in-process against the fetched array so that we
// never have to maintain aggregate indexes in the data lake.
//
// License-point tallies are deliberately NOT stored — consumers compute them
// at read time by walking the returned `sanctions[]` arrays.

async function fetchLeagueSeasonRulings(
    league: number | string,
    season: number | string
): Promise<StewardRuling[]> {
    const doc = await getDataLakeDocument({
        namespace: 'ldata-stward',
        type: 'rulings',
        league,
        season,
    });

    if (!doc) return [];
    if (Array.isArray(doc)) return doc as StewardRuling[];
    if (Array.isArray((doc as any).rulings)) {
        return (doc as any).rulings as StewardRuling[];
    }
    return [];
}

export async function getAllRulings(
    league: number | string,
    season: number | string
): Promise<StewardRuling[]> {
    console.log('::: getAllRulings():', league, season);
    return await fetchLeagueSeasonRulings(league, season);
}

export async function getRulingsByDriver(
    league: number | string,
    season: number | string,
    driver: { discord_user_id?: string; driver_id?: number }
): Promise<StewardRuling[]> {
    console.log('::: getRulingsByDriver():', league, season, driver);
    const all = await fetchLeagueSeasonRulings(league, season);
    return all.filter((r) => {
        if (driver.discord_user_id !== undefined) {
            return r.discord_user_id === driver.discord_user_id;
        }
        if (driver.driver_id !== undefined) {
            return r.driver_id === driver.driver_id;
        }
        return false;
    });
}

export async function getRulingsBySessionType(
    league: number | string,
    season: number | string,
    session_type: string
): Promise<StewardRuling[]> {
    console.log('::: getRulingsBySessionType():', league, season, session_type);
    const all = await fetchLeagueSeasonRulings(league, season);
    return all.filter((r) => r.session_type === session_type);
}

// ---------------------------------------------------------------------------
// Relational-DB accessors (steward_config table)
// ---------------------------------------------------------------------------
//
// Steward configuration lives in the relational database — NOT in
// `ldata-usrcfg` — because it is mutable operational state that the REST
// layer writes to at runtime.

export async function getStewardConfig(
    league_id: number
): Promise<StewardConfig | null> {
    console.log('::: getStewardConfig():', league_id);
    const { records } = await sql`
        SELECT league_id, race_control_channel_id
        FROM steward_config
        WHERE league_id = ${league_id}
        LIMIT 1`;

    const rec = records[0] as any;
    if (!rec) return null;

    return {
        league_id: rec.league_id,
        race_control_channel_id: rec.race_control_channel_id ?? null,
    };
}

export async function setRaceControlChannelId(
    league_id: number,
    race_control_channel_id: string | null
): Promise<void> {
    console.log(
        '::: setRaceControlChannelId():',
        league_id,
        race_control_channel_id
    );
    await sql`
        INSERT INTO steward_config (league_id, race_control_channel_id)
        VALUES (${league_id}, ${race_control_channel_id})
        ON CONFLICT(league_id) DO UPDATE SET
            race_control_channel_id = excluded.race_control_channel_id`;
}

// ---------------------------------------------------------------------------
// Namespace handler — routes `ldata-stward` queries through the accessors
// above so that `getDocument('ldata-stward', …)` works the same way as other
// namespaces registered in `ftchdata`.

export async function stewardHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log(':: stewardHandler():', query?.type);

    const q = query || {};
    switch (q.type) {
        case 'rulings':
            return await getAllRulings(q.league, q.season);
        case 'rulingsByDriver':
            return await getRulingsByDriver(q.league, q.season, {
                discord_user_id: q.discord_user_id,
                driver_id: q.driver_id,
            });
        case 'rulingsBySessionType':
            return await getRulingsBySessionType(
                q.league,
                q.season,
                q.sessionType || q.session_type
            );
        case 'stewardConfig':
            return await getStewardConfig(Number.parseInt(q.league, 10));
        case 'setRaceControlChannelId':
            await setRaceControlChannelId(
                Number.parseInt(q.league, 10),
                q.race_control_channel_id ?? null
            );
            return await getStewardConfig(Number.parseInt(q.league, 10));
    }

    return null;
}
