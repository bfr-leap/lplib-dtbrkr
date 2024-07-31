import { getDocument as getDataLakeDocument } from './dtlkdata';
import { getXataClient, XataClient } from './xata';
import type { UsersLeaguesInterestRecord } from './xata';

export async function getDefaultLeagueSeason(user_id: string): Promise<any> {
    console.log('getDefaultLeagueSeason()', user_id);

    const xata: XataClient = getXataClient();

    const page = await xata.sql`
    SELECT "seasons"."league_id", "seasons"."season_id"
    FROM "sched_subsessions"
    INNER JOIN "seasons" ON
    "sched_subsessions"."season_id"="seasons"."season_id"
    INNER JOIN "users_leagues_interest" ON
    "users_leagues_interest"."league_id"="seasons"."league_id"
     WHERE "time" > ${new Date()} AND "user_id"=${user_id}
     ORDER BY "time"
     FETCH FIRST 1 ROW ONLY`;

    return page?.records?.[0] || { league_id: 6555, season_id: 99410 };
}

export async function userFeatures(user_id: string): Promise<any> {
    console.log('userFeatures(): ', user_id);
    const xata: XataClient = getXataClient();

    const ret = await xata.sql`
    SELECT "display_name", "user_id", "release_to_all"
    FROM "app_features"
    LEFT JOIN "users_app_features" ON
    "users_app_features"."feature_id"="app_features"."id" and "users_app_features"."user_id"=${user_id}
    WHERE ("app_features"."release_to_some" AND "users_app_features"."user_id" IS NOT NULL) OR
    ("app_features"."release_to_all")
    `;

    return ret.records.map((r: any) => r.display_name);
}

export async function getIrLinkState(user_id: string): Promise<any> {
    console.log('getIrLinkState():', user_id);
    const ret = {
        isVerified: false,
        irCustId: '',
        msgSent: false,
    };

    const xata: XataClient = getXataClient();
    const userLink = await xata.db.user_ir_cust_mappings
        .select([
            'user_id',
            'ir_cust_id',
            'verify_code',
            'is_verified',
            'msg_sent',
        ])
        .filter({ user_id })
        .getFirst();

    if (null !== userLink) {
        ret.isVerified = userLink.is_verified === true;
        ret.irCustId = userLink.ir_cust_id || '';
        ret.msgSent = userLink.msg_sent === true;
    }

    return ret;
}

export async function updIrLinkDriver(
    user_id: string,
    ir_cust_id: string
): Promise<any> {
    console.log('updIrLinkDriver():', user_id);
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.user_ir_cust_mappings
        .select(['user_id', 'try_count'])
        .filter({ user_id })
        .getFirst();

    let try_count = -1;

    if (userLink) {
        try_count = userLink.try_count;
        await userLink.delete();
    }

    ++try_count;

    const numDigits = 6;
    const verify_code =
        Number.parseInt(
            new Array(numDigits)
                .fill(0)
                .map((v) => Math.round(Math.random() * 9).toString())
                .join('')
        ) || 0;

    await xata.db.user_ir_cust_mappings.create({
        user_id,
        verify_code,
        ir_cust_id,
        try_count,
    });

    return {};
}

export async function updIrLinkCode(
    user_id: string,
    verify_code: string
): Promise<any> {
    console.log('updIrLinkCode():', user_id);
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.user_ir_cust_mappings
        .select(['id', 'user_id', 'verify_code', 'is_verified', 'try_count'])
        .filter({ user_id })
        .getFirst();

    if (null !== userLink && userLink.verify_code?.toString() === verify_code) {
        console.log('updIrLinkCode() Success');
        await userLink.update({ is_verified: true });
    } else {
        console.log('updIrLinkCode() Fail');
        let try_count = 1 + (userLink?.try_count || 0);
        await userLink?.update({ try_count });
    }

    return {};
}

async function getUserLeaguesState(user_id: string): Promise<any> {
    console.log('getUserLeaguesState():', user_id);
    try {
        const xata: XataClient = getXataClient();
        const { records } = await xata.sql<UsersLeaguesInterestRecord>`
        SELECT 
          "leagues"."name", 
          "leagues"."league_id",
          "short_name"
        FROM "users_leagues_interest"
        INNER JOIN "leagues" ON
          "users_leagues_interest"."league_id"="leagues"."league_id"
        WHERE "user_id"=${user_id}`;

        return records;
    } catch (e) {
        console.log(e);
    }

    return {};
}

async function updUserLeaguesState(
    user_id: string,
    code: string
): Promise<any> {
    console.log('updUserLeaguesState():', user_id, code);

    const codes = code.split('-').map((c) => Number.parseInt(c));

    let isValidInput: boolean = true;
    for (let c of codes) {
        if (isNaN(c)) {
            isValidInput = false;
            break;
        }
    }

    if (isValidInput) {
        const xata: XataClient = getXataClient();

        let s = {
            statement: `
                DELETE FROM "users_leagues_interest"
                WHERE "user_id" = '${user_id}'
                AND "league_id" NOT IN (${codes.join(', ')})
            `,
        };

        await xata.sql<UsersLeaguesInterestRecord>(s, []);

        s = {
            statement: `
                INSERT INTO "users_leagues_interest" ("user_id", "league_id")
                SELECT '${user_id}', "league_id"
                FROM (VALUES ${codes
                    .map((c) => `(${c})`)
                    .join(', ')}) AS ids("league_id")
                WHERE "league_id" NOT IN (
                    SELECT "league_id"
                    FROM "users_leagues_interest"
                    WHERE "user_id" = '${user_id}'
                );`,
        };

        await xata.sql<UsersLeaguesInterestRecord>(s, []);
    }

    return await getUserLeaguesState(user_id);
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

async function defLgSeasSubCtx_noParams(userID: string): Promise<any> {
    console.log('defLgSeasSubCtx_noParams()', `[${userID}]`);
    const xata: XataClient = getXataClient();

    const q1 = xata.sql`
        SELECT "seasons"."league_id", "seasons"."season_id", "time", ("time" - ${new Date()}) as  "delta"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        INNER JOIN "users_leagues_interest" ON
        "users_leagues_interest"."league_id"="seasons"."league_id"
        WHERE "time" > ${new Date()} AND "users_leagues_interest"."user_id"=${userID}
        ORDER BY "time" ASC
        FETCH FIRST 1 ROW ONLY`;

    const q2 = xata.sql`
        SELECT "seasons"."league_id", "seasons"."season_id", "time", (${new Date()} - "time") as  "delta"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        INNER JOIN "users_leagues_interest" ON
        "users_leagues_interest"."league_id"="seasons"."league_id"
        WHERE "time" < ${new Date()} AND "users_leagues_interest"."user_id"=${userID}
        ORDER BY "time" DESC
        FETCH FIRST 1 ROW ONLY`;

    let [p1, p2] = await Promise.all([q1, q2]);
    const futRecs: any = p1.records[0];
    const pasRecs: any = p2.records[0];

    const now = new Date().getTime();
    const ret =
        new Date(futRecs?.time || now * 2).getTime() - now <
        now - new Date(pasRecs?.time || 0).getTime()
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

async function defLgSeasSubCtx_forLeague(
    userID: string,
    league: string
): Promise<any> {
    console.log('defLgSeasSubCtx_forLeague()');
    const xata: XataClient = getXataClient();

    if ((await isValidLeague(league)) === false) {
        return defLgSeasSubCtx_noParams(userID);
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
        return await defLgSeasSubCtx_noParams(userID);
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
    userID: string,
    league: string,
    season: string
): Promise<any> {
    console.log('defLgSeasSubCtx_forSeason()');

    if ((await isValidSeason(season)) === 0) {
        return defLgSeasSubCtx_forLeague(userID, league);
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
        return await defLgSeasSubCtx_forLeague(userID, league);
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
    userID: string,
    league: string,
    season: string,
    subsession: string
): Promise<any> {
    console.log('defLgSeasSubCtx_forSubsession()');

    let subsession_id = Number.parseInt(subsession, 10);
    if (isNaN(subsession_id)) {
        return await defLgSeasSubCtx_forSeason(userID, league, season);
    }

    let season_id = Number.parseInt(season, 10);
    if (isNaN(season_id)) {
        return await defLgSeasSubCtx_forLeague(userID, league);
    }

    let league_id = Number.parseInt(league);
    if (isNaN(league_id)) {
        return await defLgSeasSubCtx_noParams(userID);
    }

    const dlDoc = await getDataLakeDocument({
        namespace: `ldata-irweb`,
        type: `leagueSeasonSessions`,
        league: league_id,
        season: season_id,
    });

    if (!dlDoc) {
        return await defLgSeasSubCtx_forLeague(userID, league);
    }

    const subsessionFound =
        dlDoc?.sessions
            ?.map((s: any) => s?.subsession_id)
            ?.indexOf(subsession_id) > 0;

    if (!subsessionFound) {
        return await defLgSeasSubCtx_forSeason(userID, league, season);
    }

    return { league_id, season_id, subsession_id };
}

async function defLgSeasSubCtx(
    userID: string,
    league: string,
    season: string,
    subsession: string
): Promise<any> {
    console.log('defLgSeasSubCtx()', userID, league);

    let ret = { league_id: '', season_id: '' };
    try {
        if (subsession) {
            ret = await defLgSeasSubCtx_forSubsession(
                userID,
                league,
                season,
                subsession
            );
        } else if (season) {
            ret = await defLgSeasSubCtx_forSeason(userID, league, season);
        } else if (league) {
            ret = await defLgSeasSubCtx_forLeague(userID, league);
        } else {
            ret = await defLgSeasSubCtx_noParams(userID);
        }
    } catch (e) {}

    return ret;
}

export async function userDataHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log('userDataHandler()');

    const q = query;

    let doc: any = null;

    switch (q?.type) {
        case 'irLinkState':
            doc = await getIrLinkState(q?.userID || '');
            break;
        case 'irLinkDriverUpd':
            doc = await updIrLinkDriver(q?.userID || '', q?.driver || '');
            break;
        case 'irLinkCodeUpd':
            doc = await updIrLinkCode(q?.userID || '', q?.code || '');
            break;
        case 'userLeagues':
            doc = await getUserLeaguesState(q?.userID || '');
            break;
        case 'userLeaguesUpd':
            doc = await updUserLeaguesState(q?.userID || '', q?.code || '');
            break;
        case 'defaultLeagueSeason':
            doc = await getDefaultLeagueSeason(q?.userID);
            break;
        case 'defLgSeasSubCtx':
            doc = await defLgSeasSubCtx(
                q?.userID || '',
                q?.league || '',
                q?.season || '',
                q?.subsession || ''
            );
            break;
        case 'userFeatures':
            doc = await userFeatures(q?.userID || '');
            break;
    }

    return doc;
}
