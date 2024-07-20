import { getDocument as getDataLakeDocument } from './dtlkdata';
import { getActiveLeagueSchedule } from './lib-usrcfg/active-league-schedule';
import { getXataClient, XataClient } from './xata';

async function getLeagueTeamsInfo(league: string): Promise<any> {
    console.log('getLeagueTeamsInfo():', league);
    const xata = getXataClient();

    const { records } = await xata.sql`
    SELECT "teams"."display_name", "teams"."id" as "team_id", "teams"."season_id", "teams_users"."ir_cust_id"
    FROM "teams"
    INNER JOIN "seasons" ON
    "seasons"."season_id"="teams"."season_id"
    INNER JOIN "teams_users" ON
    "teams"."id"="teams_users"."team_id"
    WHERE "seasons"."league_id"=${league}`;

    let ret = { leageu_id: Number.parseInt(league, 10), seasons: <any[]>[] };

    let seasonM: any = {};
    let teamM: any = {};

    for (let rec of <any>records) {
        let season = seasonM[rec.season_id];
        if (!season) {
            season = seasonM[rec.season_id] = {
                season_id: rec.season_id,
                teams: [],
            };
            ret.seasons.push(season);
        }

        let team = teamM[rec.team_id];
        if (!team) {
            team = teamM[rec.team_id] = {
                team_name: rec.display_name,
                team_id: rec.team_id,
                team_members: [],
            };
            season.teams.push(team);
        }

        team.team_members.push(rec.ir_cust_id);
    }

    return ret;
}

async function getTrackDisplayInfo(): Promise<any> {
    console.log('getTrackDisplayInfo():');
    const xata = getXataClient();
    const records = await xata.sql`
        SELECT "display_name", "short_name", "track_id" 
        FROM "tracks"`;

    const ret: any = {};
    for (let t of <any>records.records) {
        ret[t.track_id] = {
            display: t.display_name,
            short_display: t.short_name,
        };
    }

    return ret;
}

async function isValidSeason(season: string): Promise<number> {
    console.log('isValidSeason()');
    const season_id = Number.parseInt(season, 10);
    if (isNaN(season_id)) {
        return 0;
    }

    const xata: XataClient = getXataClient();

    const { records } = await xata.sql`
        SELECT "league_id"
        FROM "seasons"
        WHERE "season_id"=${season_id}`;

    return records.length > 0 ? (<any>records)[0].league_id : 0;
}

async function isValidLeague(league: string): Promise<boolean> {
    const league_id = Number.parseInt(league, 10);
    if (isNaN(league_id)) {
        return false;
    }

    const xata: XataClient = getXataClient();

    const { records } = await xata.sql`
        SELECT "season_id"
        FROM "seasons"
        WHERE "league_id"=${league_id}`;

    return records.length > 0;
}

async function defLgSeasSubCtx_noParams(): Promise<any> {
    console.log('defLgSeasSubCtx_noParams()');
    const xata: XataClient = getXataClient();

    const q1 = xata.sql`
        SELECT "seasons"."league_id", "seasons"."season_id", "time", ("time" - ${new Date()}) as  "delta"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        WHERE "time" > ${new Date()}
        ORDER BY "time" ASC
        FETCH FIRST 1 ROW ONLY`;

    const q2 = xata.sql`
        SELECT "seasons"."league_id", "seasons"."season_id", "time", (${new Date()} - "time") as  "delta"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        WHERE "time" < ${new Date()}
        ORDER BY "time" DESC
        FETCH FIRST 1 ROW ONLY`;

    let [p1, p2] = await Promise.all([q1, q2]);
    const futRecs: any = p1.records[0];
    const pasRecs: any = p2.records[0];

    const now = new Date().getTime();
    const ret =
        new Date(futRecs.time).getTime() - now <
            now - new Date(pasRecs.time).getTime()
            ? futRecs
            : pasRecs;

    const dlDoc = await getDataLakeDocument({
        namespace: `ldata-irweb`,
        type: `leagueSeasonSessions`,
        league: ret.league_id,
        season: ret.season_id,
    });

    ret.subsession_id =
        dlDoc?.sessions
            ?.map((s: any) => s?.subsession_id)
            ?.filter((v: any) => v)
            ?.sort((a: any, b: any) => b - a)?.[0] || 0;

    return {
        league_id: ret.league_id,
        season_id: ret.season_id,
        subsession_id: ret.subsession_id,
    };
}

async function defLgSeasSubCtx_forLeague(league: string): Promise<any> {
    console.log('defLgSeasSubCtx_forLeague()');
    const xata: XataClient = getXataClient();

    if ((await isValidLeague(league)) === false) {
        return defLgSeasSubCtx_noParams();
    }

    const q1 = xata.sql`
        SELECT "seasons"."league_id", "seasons"."season_id", "time", ("time" - ${new Date()}) as  "delta"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        WHERE "time" > ${new Date()} AND "seasons"."league_id"=${league}
        ORDER BY "time" ASC
        FETCH FIRST 1 ROW ONLY`;

    const q2 = xata.sql`
        SELECT "seasons"."league_id", "seasons"."season_id", "time", (${new Date()} - "time") as  "delta"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        WHERE "time" < ${new Date()} AND "seasons"."league_id"=${league}
        ORDER BY "time" DESC
        FETCH FIRST 1 ROW ONLY`;

    let [p1, p2] = await Promise.all([q1, q2]);
    const futRecs: any = p1.records[0];
    const pasRecs: any = p2.records[0];

    let ret: any = [];

    if (!futRecs && !pasRecs) {
        return await defLgSeasSubCtx_noParams();
    } else if (!futRecs) {
        ret = pasRecs;
    } else if (!pasRecs) {
        ret = futRecs;
    } else {
        const now = new Date().getTime();
        ret =
            new Date(futRecs.time).getTime() - now <
                now - new Date(pasRecs.time).getTime()
                ? futRecs
                : pasRecs;
    }

    const dlDoc = await getDataLakeDocument({
        namespace: `ldata-irweb`,
        type: `leagueSeasonSessions`,
        league: ret.league_id,
        season: ret.season_id,
    });

    ret.subsession_id =
        dlDoc?.sessions
            ?.map((s: any) => s?.subsession_id)
            ?.filter((v: any) => v)
            ?.sort((a: any, b: any) => b - a)?.[0] || 0;

    return {
        league_id: ret.league_id,
        season_id: ret.season_id,
        subsession_id: ret.subsession_id,
    };
}

async function defLgSeasSubCtx_forSeason(
    league: string,
    season: string
): Promise<any> {
    console.log('defLgSeasSubCtx_forSeason()');

    if ((await isValidSeason(season)) === 0) {
        return defLgSeasSubCtx_forLeague(league);
    }

    const xata: XataClient = getXataClient();

    const q1 = xata.sql`
        SELECT "seasons"."league_id", "seasons"."season_id", "time", ("time" - ${new Date()}) as  "delta"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        WHERE "time" > ${new Date()} AND "seasons"."season_id"=${season}
        ORDER BY "time" ASC
        FETCH FIRST 1 ROW ONLY`;

    const q2 = xata.sql`
        SELECT "seasons"."league_id", "seasons"."season_id", "time", (${new Date()} - "time") as  "delta"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        WHERE "time" < ${new Date()} AND "seasons"."season_id"=${season}
        ORDER BY "time" DESC
        FETCH FIRST 1 ROW ONLY`;

    let [p1, p2] = await Promise.all([q1, q2]);
    const futRecs: any = p1.records[0];
    const pasRecs: any = p2.records[0];

    let ret: any = [];

    if (!futRecs && !pasRecs) {
        return await defLgSeasSubCtx_forLeague(league);
    } else if (!futRecs) {
        ret = pasRecs;
    } else if (!pasRecs) {
        ret = futRecs;
    } else {
        const now = new Date().getTime();
        ret =
            new Date(futRecs.time).getTime() - now <
                now - new Date(pasRecs.time).getTime()
                ? futRecs
                : pasRecs;
    }

    const dlDoc = await getDataLakeDocument({
        namespace: `ldata-irweb`,
        type: `leagueSeasonSessions`,
        league: ret.league_id,
        season: ret.season_id,
    });

    ret.subsession_id =
        dlDoc?.sessions
            ?.map((s: any) => s?.subsession_id)
            ?.filter((v: any) => v)
            ?.sort((a: any, b: any) => b - a)?.[0] || 0;

    return {
        league_id: ret.league_id,
        season_id: ret.season_id,
        subsession_id: ret.subsession_id,
    };
}

async function defLgSeasSubCtx_forSubsession(
    league: string,
    season: string,
    subsession: string
): Promise<any> {
    console.log('defLgSeasSubCtx_forSubsession()');

    let subsession_id = Number.parseInt(subsession, 10);
    if (isNaN(subsession_id)) {
        return await defLgSeasSubCtx_forSeason(league, season);
    }

    let season_id = Number.parseInt(season, 10);
    if (isNaN(season_id)) {
        return await defLgSeasSubCtx_forLeague(league);
    }

    let league_id = Number.parseInt(league);
    if (isNaN(league_id)) {
        return await defLgSeasSubCtx_noParams();
    }

    const dlDoc = await getDataLakeDocument({
        namespace: `ldata-irweb`,
        type: `leagueSeasonSessions`,
        league: league_id,
        season: season_id,
    });

    if (!dlDoc) {
        return await defLgSeasSubCtx_forLeague(league);
    }

    const subsessionFound =
        dlDoc?.sessions
            ?.map((s: any) => s?.subsession_id)
            ?.indexOf(subsession_id) > 0;

    if (!subsessionFound) {
        return await defLgSeasSubCtx_forSeason(league, season);
    }

    return { league_id, season_id, subsession_id };
}

async function defLgSeasSubCtx(
    league: string,
    season: string,
    subsession: string
): Promise<any> {
    console.log('defLgSeasSubCtx()', league);

    let ret = { league_id: '', season_id: '' };
    try {
        if (subsession) {
            ret = await defLgSeasSubCtx_forSubsession(
                league,
                season,
                subsession
            );
        } else if (season) {
            ret = await defLgSeasSubCtx_forSeason(league, season);
        } else if (league) {
            ret = await defLgSeasSubCtx_forLeague(league);
        } else {
            ret = await defLgSeasSubCtx_noParams();
        }
    } catch (e) { }

    return ret;
}

export async function userConfigHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log('userConfigHandler()');

    const q = query;
    let doc: any = null;

    switch (q?.type) {
        case 'leagueTeamsInfo':
            doc = await getLeagueTeamsInfo(q?.league);
            break;
        case 'activeLeagueSchedule':
            doc = await getActiveLeagueSchedule();
            break;
        case 'trackDisplayInfo':
            doc = await getTrackDisplayInfo();
            break;
        case 'defLgSeasSubCtx':
            doc = await defLgSeasSubCtx(
                q?.league || '',
                q?.season || '',
                q?.subsession || ''
            );
            break;
    }

    return doc;
}
