import { getXataClient, XataClient } from '../xata';

export async function getActiveLeagueSchedule(
    incJournalist: boolean = false
): Promise<any> {
    console.log('getActiveLeagueSchedule():');

    const xata = getXataClient();

    const rt: any = await xata.sql`
        SELECT "sched_subsessions"."id", "seasons"."league_id", "leagues"."name" as "league_name", "car_id", "seasons"."display_name" as "season_name", "time", 
        "track_id", "sched_subsessions"."season_id", "journalists"."style_name", "journalists"."fine_tuning_prompt",
        "sched_subsessions"."display_name" as "event_name"
        FROM "sched_subsessions"
        INNER JOIN "seasons" ON
        "sched_subsessions"."season_id"="seasons"."season_id"
        INNER JOIN "leagues" ON
        "leagues"."league_id"="seasons"."league_id"
        INNER JOIN "journalists_leagues" ON
        "journalists_leagues"."league_id"="seasons"."league_id"
        INNER JOIN "journalists" ON
        "journalists_leagues"."journalist_id"="journalists"."id"
        WHERE "seasons"."is_active"
        ORDER BY "seasons"."league_id" ASC, "sched_subsessions"."season_id" ASC, "time" ASC`;

    let leaguesM: any = {};
    let seasonsM: any = {};
    let leagues: any[] = [];

    for (let r of rt.records) {
        let league = leaguesM[r.league_id];
        if (!league) {
            league = leaguesM[r.league_id] = {
                league_id: r.league_id,
                name: r.league_name,

                seasons: [],
            };

            if (incJournalist) {
                league.journalistStyleName = r.style_name;
                league.journalistFineTunning = r.fine_tuning_prompt;
            }

            leagues.push(league);
        }

        let season = seasonsM[r.season_id];
        if (!season) {
            season = seasonsM[r.season_id] = {
                season_id: r.season_id,
                car_id: r.car_id,
                comment: r.season_name,
                events: [],
            };
            league.seasons.push(season);
        }

        let event = {
            event_id: r.id,
            time: r.time,
            track_id: r.track_id,
            comment: r.event_name,
        };
        season.events.push(event);
    }

    return { leagues };
}
