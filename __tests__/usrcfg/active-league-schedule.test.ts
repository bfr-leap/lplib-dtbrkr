import { getActiveLeagueSchedule } from '../../src/lib-usrcfg/active-league-schedule';

import { ACTIVE_LEAGUE_SCHEDULE } from './static-active-league-schedule';

describe('active-league-schedule', () => {
    test('Retrieve Active League Schedule from DB', async () => {
        let leagueSchedule = await getActiveLeagueSchedule(true);

        expect(leagueSchedule).toEqual(ACTIVE_LEAGUE_SCHEDULE);
    }, 60000);
});
