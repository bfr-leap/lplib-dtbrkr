import { getDb, sql, executeInsert } from '../../src/db';
import { ACTIVE_LEAGUE_SCHEDULE } from '../../src/lib-usrcfg/static-active-league-schedule';

let jsonInput = ACTIVE_LEAGUE_SCHEDULE;

export async function seedActiveLeagueSchedule() {
    console.log('seedActiveLeagueSchedule() start');

    const db = getDb();

    db.exec(`DELETE FROM "sched_subsessions"`);
    db.exec(`DELETE FROM "seasons"`);

    for (let league of jsonInput.leagues) {
        for (let season of league.seasons) {
            await sql`
                INSERT INTO seasons (season_id, car_id, display_name, league_id, is_active)
                VALUES (${season.season_id}, ${season.car_id}, ${season.comment}, ${league.league_id}, 1)`;

            for (let event of season.events) {
                await sql`
                    INSERT INTO sched_subsessions (time, track_id, season_id, display_name)
                    VALUES (${event.time}, ${event.track_id}, ${season.season_id}, ${event.comment})`;
            }
        }
    }

    // Extra inactive seasons for league 637
    for (let seasonId of [
        101995, 98333, 95908, 93330, 90266, 87396, 84635, 80401, 78210, 74865,
        67781, 65438, 63157, 60562,
    ]) {
        await sql`
            INSERT INTO seasons (league_id, season_id, car_id, display_name, is_active)
            VALUES (637, ${seasonId}, 106, 'TBD', 0)`;
        await sql`
            INSERT INTO sched_subsessions (season_id, display_name, time)
            VALUES (${seasonId}, 'dummy', '1970-01-01T00:00:00.000Z')`;
    }

    // Extra inactive seasons for league 6555
    for (let seasonId of [
        94109, 94108, 87366, 87365, 84058, 80139, 75156, 75155, 75154, 65824,
        65823, 62504,
    ]) {
        await sql`
            INSERT INTO seasons (league_id, season_id, car_id, display_name, is_active)
            VALUES (6555, ${seasonId}, 106, 'TBD', 0)`;
        await sql`
            INSERT INTO sched_subsessions (season_id, display_name, time)
            VALUES (${seasonId}, 'dummy', '1970-01-01T00:00:00.000Z')`;
    }

    // Extra inactive seasons for league 4534
    for (let seasonId of [
        98603, 95267, 92111, 88501, 84890, 80261, 75532, 65777,
    ]) {
        await sql`
            INSERT INTO seasons (league_id, season_id, car_id, display_name, is_active)
            VALUES (4534, ${seasonId}, 106, 'TBD', 0)`;
        await sql`
            INSERT INTO sched_subsessions (season_id, display_name, time)
            VALUES (${seasonId}, 'dummy', '1970-01-01T00:00:00.000Z')`;
    }

    // Extra inactive seasons for league 3630
    for (let seasonId of [
        102316, 96115, 96114, 95353, 95115, 89931, 89930, 89421, 87519, 86986,
        84315, 83218, 79987, 79944, 77238, 67144, 67143, 66833, 66832, 64717,
    ]) {
        await sql`
            INSERT INTO seasons (league_id, season_id, car_id, display_name, is_active)
            VALUES (3630, ${seasonId}, 106, 'TBD', 0)`;
        await sql`
            INSERT INTO sched_subsessions (season_id, display_name, time)
            VALUES (${seasonId}, 'dummy', '1970-01-01T00:00:00.000Z')`;
    }

    db.exec(`DELETE FROM "leagues"`);
    const leagues = [
        { league_id: 6555, short_name: 'iFL', name: 'iFormula League' },
        { league_id: 637, short_name: 'iGP', name: 'iGP Fun' },
        { league_id: 4534, short_name: 'LZ', name: 'League Zero' },
        { league_id: 3630, short_name: 'J2iCS', name: 'J2iCS' },
    ];
    for (let league of leagues) {
        await sql`
            INSERT INTO leagues (league_id, short_name, name)
            VALUES (${league.league_id}, ${league.short_name}, ${league.name})`;
    }

    db.exec(`DELETE FROM "journalists"`);
    db.exec(`DELETE FROM "journalists_leagues"`);

    const journalists = [
        {
            display_name: 'Formal',
            fine_tuning_prompt:
                "Use clear and simple language. Stay away from poetic language and stick to the facts. Focus on the most significant moments and drivers. Start with the race's beginning, move through the middle, and conclude with the end. Highlight key turning points and pivotal moments. Ensure a balanced focus on important drivers and events. Avoid redundant descriptions and repetition. Clearly link events and strategies to their outcomes in the race. Explain the significance of key moments and how they impact the overall narrative. Keep introductory and conclusion paragraphs succinct.",
            style_name: 'Peter Windsor',
            leagues: [6555, 637],
        },
        {
            display_name: 'Spicy Roast',
            fine_tuning_prompt:
                'Write about the big winners and losers. Key events in the race and make fun of drivers when appropriate. Remember that the drivers are the target audience and they want to be abused. Be sure not to reuse phrases from previous reports.',
            style_name: 'Jeremy Clarkson',
            leagues: [4534, 3630],
        },
    ];

    for (let jour of journalists) {
        const journalistId = executeInsert(
            `INSERT INTO journalists (display_name, fine_tuning_prompt, style_name)
             VALUES (?, ?, ?)`,
            [jour.display_name, jour.fine_tuning_prompt, jour.style_name]
        );

        for (let leagueId of jour.leagues) {
            await sql`
                INSERT INTO journalists_leagues (journalist_id, league_id)
                VALUES (${journalistId}, ${leagueId})`;
        }
    }

    console.log('seedActiveLeagueSchedule() done');
}
