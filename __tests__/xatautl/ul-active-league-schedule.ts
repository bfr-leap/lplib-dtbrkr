import { getXataClient } from '../../src/xata';
import { ACTIVE_LEAGUE_SCHEDULE } from '../usrcfg/static-active-league-schedule';

let jsonInput = ACTIVE_LEAGUE_SCHEDULE;

export async function uploadActiveLeagueSchedule() {
    console.log('uploadActiveLeagueSchedule() start');
    const xata = getXataClient();

    await xata.sql`DELETE FROM "seasons" WHERE 1=1`;
    await xata.sql`DELETE FROM "sched_subsessions" WHERE 1=1`;

    for (let league of jsonInput.leagues) {
        // console.log(league.league_id);
        for (let season of league.seasons) {
            // console.log(season.season_id);
            await xata.db.seasons.create({
                season_id: season.season_id,
                car_id: season.car_id,
                display_name: season.comment,
                league_id: league.league_id,
                is_active: true,
            });
            for (let event of season.events) {
                //   console.log(event);
                await xata.db.sched_subsessions.create({
                    time: new Date(event.time),
                    track_id: event.track_id,
                    season_id: season.season_id,
                    display_name: event.comment,
                });
            }
        }
    }

    for (let season of [
        101995, 98333, 95908, 93330, 90266, 87396, 84635, 80401, 78210, 74865,
        67781, 65438, 63157, 60562,
    ]) {
        await xata.db.seasons.create({
            league_id: 637,
            season_id: season,
            car_id: 106,
            display_name: 'TBD',
            is_active: false,
        });

        await xata.db.sched_subsessions.create({
            season_id: season,
            display_name: 'dummy',
            time: new Date(0),
        });
    }

    for (let season of [
        94109, 94108, 87366, 87365, 84058, 80139, 75156, 75155, 75154, 65824,
        65823, 62504,
    ]) {
        await xata.db.seasons.create({
            league_id: 6555,
            season_id: season,
            car_id: 106,
            display_name: 'TBD',
            is_active: false,
        });

        await xata.db.sched_subsessions.create({
            season_id: season,
            display_name: 'dummy',
            time: new Date(0),
        });
    }

    for (let season of [
        98603, 95267, 92111, 88501, 84890, 80261, 75532, 65777,
    ]) {
        await xata.db.seasons.create({
            league_id: 4534,
            season_id: season,
            car_id: 106,
            display_name: 'TBD',
            is_active: false,
        });

        await xata.db.sched_subsessions.create({
            season_id: season,
            display_name: 'dummy',
            time: new Date(0),
        });
    }

    for (let season of [
        102316, 96115, 96114, 95353, 95115, 89931, 89930, 89421, 87519, 86986,
        84315, 83218, 79987, 79944, 77238, 67144, 67143, 66833, 66832, 64717,
    ]) {
        await xata.db.seasons.create({
            league_id: 3630,
            season_id: season,
            car_id: 106,
            display_name: 'TBD',
            is_active: false,
        });

        await xata.db.sched_subsessions.create({
            season_id: season,
            display_name: 'dummy',
            time: new Date(0),
        });
    }

    await xata.sql`DELETE FROM "leagues" WHERE 1=1`;
    let leagues = [
        { league_id: 6555, short_name: 'iFL', name: 'iFormula League' },
        { league_id: 637, short_name: 'iGP', name: 'iGP Fun' },
        { league_id: 4534, short_name: 'LZ', name: 'League Zero' },
        { league_id: 3630, short_name: 'J2iCS', name: 'J2iCS' },
    ];
    for (let league of leagues) {
        await xata.db.leagues.create({
            league_id: league.league_id,
            short_name: league.short_name,
            name: league.name,
        });
    }

    await xata.sql`DELETE FROM "journalists" WHERE 1=1`;
    await xata.sql`DELETE FROM "journalists_leagues" WHERE 1=1`;
    let jour = [
        {
            display_name: 'Formal',
            fine_tuning_prompt:
                "Use clear and simple language. Stay away from poetic language and stick to the facts. Focus on the most significant moments and drivers. Start with the race's beginning, move through the middle, and conclude with the end. Highlight key turning points and pivotal moments. Ensure a balanced focus on important drivers and events. Avoid redundant descriptions and repetition. Clearly link events and strategies to their outcomes in the race. Explain the significance of key moments and how they impact the overall narrative. Keep introductory and conclusion paragraphs succinct.",
            id: 'rec_cq6ieq7th4sl420j01og',
            style_name: 'Peter Windsor',
            xata: {
                createdAt: '2024-07-09T12:04:56.788Z',
                updatedAt: '2024-07-09T12:06:02.277Z',
                version: 1,
            },
        },
        {
            display_name: 'Spicy Roast',
            fine_tuning_prompt:
                'Write about the big winners and losers. Key events in the race and make fun of drivers when appropriate. Remember that the drivers are the target audience and they want to be abused. Be sure not to reuse phrases from previous reports.',
            id: 'rec_cq6ifsflt8e3uok8at20',
            style_name: 'Jeremy Clarkson',
            xata: {
                createdAt: '2024-07-09T12:07:13.655Z',
                updatedAt: '2024-07-09T12:07:13.655Z',
                version: 0,
            },
        },
    ];

    let r = await xata.db.journalists.create({
        display_name: jour[0].display_name,
        fine_tuning_prompt: jour[0].fine_tuning_prompt,
        style_name: jour[0].style_name,
    });

    await xata.db.journalists_leagues.create({
        journalist_id: r.id,
        league_id: 6555,
    });

    await xata.db.journalists_leagues.create({
        journalist_id: r.id,
        league_id: 637,
    });

    r = await xata.db.journalists.create({
        display_name: jour[1].display_name,
        fine_tuning_prompt: jour[1].fine_tuning_prompt,
        style_name: jour[1].style_name,
    });

    await xata.db.journalists_leagues.create({
        journalist_id: r.id,
        league_id: 4534,
    });

    await xata.db.journalists_leagues.create({
        journalist_id: r.id,
        league_id: 3630,
    });

    console.log('uploadActiveLeagueSchedule() done');
}
