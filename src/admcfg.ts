import { sql, executeInsert } from './db';
import { featureMiddleware as fmw } from './feature-middleware';

async function crtSchedEvent(season: string, time: string, track: string) {
    console.log('crtSchedEvent():', season, time, track);
    const seasonId = Number.parseInt(season, 10);
    const trackId = Number.parseInt(track, 10);
    const timeNum = Number.parseInt(time, 10);
    const timeDate = isNaN(timeNum) ? null : new Date(timeNum);

    const isValidInputs = !isNaN(trackId) && timeDate !== null;

    console.log(isValidInputs);

    if (isValidInputs) {
        const timeStr = timeDate!.toISOString();
        const newId = executeInsert(
            `INSERT INTO sched_subsessions (time, track_id, season_id, display_name)
             VALUES (?, ?, ?, 'NA')`,
            [timeStr, trackId, seasonId]
        );

        const ret = { id: newId, time: timeStr, track_id: trackId, season_id: seasonId, display_name: 'NA' };
        console.log(ret);
        return ret;
    }

    return {};
}

async function updSchedEvent(event: string, time: string, track: string) {
    console.log('updSchedEvent():', event, time, track);
    const trackId = Number.parseInt(track, 10);
    const timeNum = Number.parseInt(time, 10);
    const timeDate = isNaN(timeNum) ? null : new Date(timeNum);

    const isValidInputs = !isNaN(trackId) && timeDate !== null;

    if (isValidInputs) {
        try {
            let r = await sql`
        UPDATE "sched_subsessions"
        SET "track_id" = ${trackId}, "time" = ${timeDate}
        WHERE "sched_subsessions"."id"=${event}`;

            console.log(r);
        } catch (e) {
            console.log(e);
        }
    }

    return {};
}

async function delSchedEvent(event: string) {
    console.log('delSchedEvent():', event);

    await sql`DELETE FROM "sched_subsessions" WHERE "id"=${event}`;

    return {};
}

export async function adminConfigHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log('adminConfigHandler()');

    const q = query;

    let doc: any = null;

    switch (q?.type) {
        case 'crtSchedEvent':
            doc = await fmw(['league_cdr_admin'], q?.userID, async () => {
                return await crtSchedEvent(q?.season, q?.time, q?.track);
            });
            break;
        case 'updSchedEvent':
            doc = await fmw(['league_cdr_admin'], q?.userID, async () => {
                return await updSchedEvent(q?.event, q?.time, q?.track);
            });
            break;
        case 'delSchedEvent':
            doc = await fmw(['league_cdr_admin'], q?.userID, async () => {
                return await delSchedEvent(q?.event);
            });
            break;
    }

    return doc;
}
