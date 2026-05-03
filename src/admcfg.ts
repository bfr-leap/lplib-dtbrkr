import { sql, executeInsert } from './db';
import { notifyDbWrite } from './db-kafka-notify';
import { featureMiddleware as fmw } from './feature-middleware';

async function lookupLeagueIdForSeason(
    seasonId: number
): Promise<number | null> {
    const { records } = await sql`
        SELECT league_id FROM seasons WHERE season_id = ${seasonId} LIMIT 1`;
    const rec = records[0] as any;
    return rec?.league_id ?? null;
}

async function lookupSchedEventScope(
    eventId: number | string
): Promise<{ league_id: number; season_id: number } | null> {
    const { records } = await sql`
        SELECT seasons.league_id, sched_subsessions.season_id
        FROM sched_subsessions
        INNER JOIN seasons ON seasons.season_id = sched_subsessions.season_id
        WHERE sched_subsessions.id = ${eventId}
        LIMIT 1`;
    const rec = records[0] as any;
    if (!rec) return null;
    return { league_id: rec.league_id, season_id: rec.season_id };
}

function notifySchedSubsessions(
    league_id: number | null | undefined,
    season_id: number | null | undefined
): void {
    if (league_id == null || season_id == null) return;
    notifyDbWrite(
        'db-league-cfg',
        'schedSubsessions',
        [league_id, season_id],
        'update'
    );
}

async function crtSchedEvent(userID: string, season: string, time: string, track: string) {
    console.log('::: crtSchedEvent():', userID, season, time, track);
    const seasonId = Number.parseInt(season, 10);
    const trackId = Number.parseInt(track, 10);
    const timeNum = Number.parseInt(time, 10);
    const timeDate = isNaN(timeNum) ? null : new Date(timeNum);

    const isValidInputs = !isNaN(trackId) && timeDate !== null;

    if (isValidInputs) {
        const timeStr = timeDate!.toISOString();
        const newId = executeInsert(
            `INSERT INTO sched_subsessions (time, track_id, season_id, display_name)
             VALUES (?, ?, ?, 'NA')`,
            [timeStr, trackId, seasonId]
        );

        const leagueId = await lookupLeagueIdForSeason(seasonId);
        notifySchedSubsessions(leagueId, seasonId);

        const ret = { id: newId, time: timeStr, track_id: trackId, season_id: seasonId, display_name: 'NA' };
        console.log('::: crtSchedEvent() success:', ret);
        return ret;
    }

    console.log('::: crtSchedEvent() invalid input:', season, time, track);
    return {};
}

async function updSchedEvent(userID: string, event: string, time: string, track: string) {
    console.log('::: updSchedEvent():', userID, event, time, track);
    const trackId = Number.parseInt(track, 10);
    const timeNum = Number.parseInt(time, 10);
    const timeDate = isNaN(timeNum) ? null : new Date(timeNum);

    const isValidInputs = !isNaN(trackId) && timeDate !== null;

    if (isValidInputs) {
        try {
            const scope = await lookupSchedEventScope(event);

            await sql`
        UPDATE "sched_subsessions"
        SET "track_id" = ${trackId}, "time" = ${timeDate}
        WHERE "sched_subsessions"."id"=${event}`;

            notifySchedSubsessions(scope?.league_id, scope?.season_id);

            console.log('::: updSchedEvent() success');
        } catch (e) {
            console.log('::: updSchedEvent() error:', e);
        }
    } else {
        console.log('::: updSchedEvent() invalid input:', event, time, track);
    }

    return {};
}

async function delSchedEvent(userID: string, event: string) {
    console.log('::: delSchedEvent():', userID, event);

    try {
        const scope = await lookupSchedEventScope(event);

        await sql`DELETE FROM "sched_subsessions" WHERE "id"=${event}`;

        notifySchedSubsessions(scope?.league_id, scope?.season_id);

        console.log('::: delSchedEvent() success');
    } catch (e) {
        console.log('::: delSchedEvent() error:', e);
    }

    return {};
}

export async function adminConfigHandler(
    namespace: string,
    query: any
): Promise<any> {
    const q = query;
    console.log(':: adminConfigHandler():', q?.type, q?.userID);

    let doc: any = null;

    switch (q?.type) {
        case 'crtSchedEvent':
            doc = await fmw(['league_cdr_admin'], q?.userID, async () => {
                return await crtSchedEvent(q?.userID, q?.season, q?.time, q?.track);
            });
            break;
        case 'updSchedEvent':
            doc = await fmw(['league_cdr_admin'], q?.userID, async () => {
                return await updSchedEvent(q?.userID, q?.event, q?.time, q?.track);
            });
            break;
        case 'delSchedEvent':
            doc = await fmw(['league_cdr_admin'], q?.userID, async () => {
                return await delSchedEvent(q?.userID, q?.event);
            });
            break;
    }

    console.log(':: returning document adminConfigHandler()', q?.type);
    return doc;
}
