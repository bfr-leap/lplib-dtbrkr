import { getActiveLeagueSchedule } from '../../src/lib-usrcfg/active-league-schedule';

import { ACTIVE_LEAGUE_SCHEDULE } from './static-active-league-schedule';

describe('active-league-schedule', () => {
    test('Retrieve Active League Schedule from DB', async () => {
        let leagueSchedule = await getActiveLeagueSchedule(true);

        expect(leagueSchedule.leagues.length).toEqual(ACTIVE_LEAGUE_SCHEDULE.leagues.length);

        for (let i = 0; i < ACTIVE_LEAGUE_SCHEDULE.leagues.length; ++i) {
            const actualLeague = leagueSchedule.leagues[i];
            const expectedLeague = ACTIVE_LEAGUE_SCHEDULE.leagues[i];

            const exactMatchKeys = ['league_id', 'name', 'journalistStyleName', 'journalistFineTunning'];
            for (let k of exactMatchKeys) {
                const actual: any = (<any>actualLeague)[k];
                const expected: any = (<any>expectedLeague)[k];
                expect(actual).toEqual(expected);
            }

            const actualSeasons = actualLeague.seasons;
            const expectedSeasons = expectedLeague.seasons;
            expect(actualSeasons.length).toEqual(expectedSeasons.length);

            for (let j = 0; j < expectedSeasons.length; ++j) {
                const actualSeason = actualSeasons[j];
                const expectedSeason = expectedSeasons[j];

                const exactMatchKeys = ['season_id', 'car_id', 'comment'];
                for (let k of exactMatchKeys) {
                    const actual: any = (<any>actualSeason)[k];
                    const expected: any = (<any>expectedSeason)[k];
                    expect(actual).toEqual(expected);
                }

                const actualEvents = actualSeason.events;
                const expectedEvents = expectedSeason.events;
                expect(actualEvents.length).toEqual(expectedEvents.length);

                for (let m = 0; m < expectedEvents.length; ++m) {
                    const actualEvent = actualEvents[m];
                    const expectedEvent = expectedEvents[m];

                    const exactMatchKeys = ['time', 'track_id', 'comment'];
                    for (let k of exactMatchKeys) {
                        const actual: any = (<any>actualEvent)[k];
                        const expected: any = (<any>expectedEvent)[k];
                        expect(actual).toEqual(expected);
                    }
                    expect(actualEvent.event_id).not.toBe(undefined);
                }
            }

        }
    }, 60000);
});
