import { getXataClient, XataClient } from './xata';
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
        const xata = getXataClient();
        const ret = await xata.db.sched_subsessions.create({
            time: timeDate,
            track_id: trackId,
            season_id: seasonId,
            display_name: 'NA',
        });

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
            const xata = getXataClient();

            let r = await xata.sql`
        UPDATE "sched_subsessions"
        SET "track_id" = ${trackId.toString()}, "time" = ${timeDate}
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
    const xata = getXataClient();

    await xata.sql`DELETE FROM "sched_subsessions" WHERE "id"=${event}`;

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
