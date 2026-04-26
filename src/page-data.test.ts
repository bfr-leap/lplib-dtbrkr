import { getPageData } from './page-data';
import { PAGE_DATA_STANDINGS, PAGE_DATA_HOME } from './static-page-data';

jest.mock('./dtlkdata', () => ({
    getDocument: jest.fn(async (query: any) => {
        const league = query.league?.toString();
        const season = query.season?.toString();
        const driver = query.driver?.toString();

        if (query.type === 'leagueSeasonSessions' && league === '4534' && season === '105035') {
            return {
                sessions: [
                    { subsession_id: 1001, launch_at: '2024-05-03T00:00:00Z', track: { track_name: 'Circuit de Barcelona Catalunya', track_id: 349 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 807711, winner_name: 'Jaden Calloway' },
                    { subsession_id: 1002, launch_at: '2024-05-10T00:00:00Z', track: { track_name: 'Autodromo Nazionale Monza', track_id: 239 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 599655, winner_name: 'Elliot Cawte' },
                    { subsession_id: 1003, launch_at: '2024-05-17T00:00:00Z', track: { track_name: 'Suzuka International Racing Course', track_id: 168 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 807711, winner_name: 'Jaden Calloway' },
                    { subsession_id: 1004, launch_at: '2024-05-24T00:01:00Z', track: { track_name: 'Silverstone Circuit', track_id: 341 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 33393, winner_name: 'Raymond Aguilar' },
                    { subsession_id: 1005, launch_at: '2024-05-31T00:00:00Z', track: { track_name: 'Canadian Tire Motorsports Park', track_id: 144 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 585611, winner_name: 'Finley Fitzsimmons' },
                    { subsession_id: 1006, launch_at: '2024-06-14T00:00:00Z', track: { track_name: 'Red Bull Ring', track_id: 403 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 585611, winner_name: 'Finley Fitzsimmons' },
                    { subsession_id: 1007, launch_at: '2024-06-21T00:00:00Z', track: { track_name: 'Donington Park Racing Circuit', track_id: 233 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 442427, winner_name: 'Aj Brenner' },
                    { subsession_id: 1008, launch_at: '2024-06-28T00:00:00Z', track: { track_name: 'Watkins Glen International', track_id: 435 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 33393, winner_name: 'Raymond Aguilar' },
                    { subsession_id: 1009, launch_at: '2024-07-19T00:00:00Z', track: { track_name: 'Algarve International Circuit', track_id: 509 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 33393, winner_name: 'Raymond Aguilar' },
                    { subsession_id: 1010, launch_at: '2024-07-26T00:00:00Z', track: { track_name: 'Circuit Zandvoort', track_id: 485 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 314637, winner_name: 'Antonio Bianchi' },
                    { subsession_id: 1011, launch_at: '2024-08-02T00:00:00Z', track: { track_name: 'Autódromo José Carlos Pace', track_id: 212 }, cars: [{ car_name: 'Super Formula SF23 - Honda' }], winner_id: 807711, winner_name: 'Jaden Calloway' },
                ],
            };
        }

        if (query.type === 'leagueSeasons' && league === '4534') {
            return {
                seasons: [
                    { season_id: 113028, season_name: 'Season XII' },
                    { season_id: 111025, season_name: 'Season XI' },
                    { season_id: 105035, season_name: 'Season X' },
                    { season_id: 98603, season_name: 'Season 9' },
                    { season_id: 95267, season_name: 'Season 8' },
                    { season_id: 92111, season_name: 'Season 7' },
                    { season_id: 88501, season_name: 'F3 Season 6' },
                    { season_id: 84890, season_name: 'F3 Season 5' },
                    { season_id: 80261, season_name: 'F3 Season 4' },
                    { season_id: 75532, season_name: 'F3 Season 3' },
                    { season_id: 65777, season_name: 'F3 Season 2' },
                    { season_id: 58618, season_name: 'F3 Season 1' },
                    { season_id: 54230, season_name: 'Legend Car Series' },
                ],
            };
        }

        if (query.type === 'leagueDriverStats' && league === '4534') {
            return {
                '105035': {
                    33393: { cust_id: 33393, power_points: 301 },
                    131358: { cust_id: 131358, power_points: 1 },
                    132921: { cust_id: 132921, power_points: 73 },
                    147217: { cust_id: 147217, power_points: 12 },
                    174470: { cust_id: 174470, power_points: 51 },
                    196486: { cust_id: 196486, power_points: 28 },
                    201632: { cust_id: 201632, power_points: 190 },
                    252005: { cust_id: 252005, power_points: 0 },
                    278262: { cust_id: 278262, power_points: 0 },
                    314637: { cust_id: 314637, power_points: 197 },
                    341031: { cust_id: 341031, power_points: 177 },
                    375326: { cust_id: 375326, power_points: 26 },
                    379025: { cust_id: 379025, power_points: 6 },
                    404668: { cust_id: 404668, power_points: 102 },
                    420622: { cust_id: 420622, power_points: 1 },
                    442427: { cust_id: 442427, power_points: 249 },
                    554488: { cust_id: 554488, power_points: 12 },
                    556375: { cust_id: 556375, power_points: 0 },
                    557710: { cust_id: 557710, power_points: 3 },
                    569413: { cust_id: 569413, power_points: 88 },
                    585611: { cust_id: 585611, power_points: 160 },
                    599655: { cust_id: 599655, power_points: 233 },
                    615385: { cust_id: 615385, power_points: 1 },
                    633016: { cust_id: 633016, power_points: 30 },
                    653413: { cust_id: 653413, power_points: 123 },
                    655406: { cust_id: 655406, power_points: 44 },
                    658392: { cust_id: 658392, power_points: 43 },
                    727284: { cust_id: 727284, power_points: 27 },
                    736836: { cust_id: 736836, power_points: 92 },
                    807711: { cust_id: 807711, power_points: 189 },
                    828330: { cust_id: 828330, power_points: 0 },
                    849261: { cust_id: 849261, power_points: 12 },
                    868186: { cust_id: 868186, power_points: 44 },
                    875586: { cust_id: 875586, power_points: 0 },
                    878797: { cust_id: 878797, power_points: 107 },
                    879688: { cust_id: 879688, power_points: 148 },
                    906412: { cust_id: 906412, power_points: 20 },
                    909846: { cust_id: 909846, power_points: 56 },
                    928442: { cust_id: 928442, power_points: 55 },
                    952281: { cust_id: 952281, power_points: 8 },
                    986846: { cust_id: 986846, power_points: 22 },
                },
            };
        }

        if (query.type === 'singleMemberData') {
            const memberData: { [k: string]: any } = {
                '33393': { display_name: 'Raymond Aguilar', club_id: 29, club_name: 'Midwest' },
                '442427': { display_name: 'Aj Brenner', club_id: 30, club_name: 'Texas' },
                '599655': { display_name: 'Elliot Cawte', club_id: 36, club_name: 'UK and I' },
            };
            return driver ? memberData[driver] || null : null;
        }

        if (query.type === 'membersData' && league === '4534' && season === '105035') {
            return {
                members: [
                    { cust_id: 33393, display_name: 'Raymond Aguilar', club_id: 29, club_name: 'Midwest' },
                    { cust_id: 442427, display_name: 'Aj Brenner', club_id: 30, club_name: 'Texas' },
                    { cust_id: 599655, display_name: 'Elliot Cawte', club_id: 36, club_name: 'UK and I' },
                    { cust_id: 314637, display_name: 'Antonio Bianchi', club_id: 15, club_name: 'Canada' },
                    { cust_id: 201632, display_name: 'Shajee Zuhair', club_id: 15, club_name: 'Canada' },
                    { cust_id: 807711, display_name: 'Jaden Calloway', club_id: 23, club_name: 'Mid-South' },
                    { cust_id: 341031, display_name: 'Nick Peterson', club_id: 29, club_name: 'Midwest' },
                    { cust_id: 585611, display_name: 'Finley Fitzsimmons', club_id: 36, club_name: 'UK and I' },
                    { cust_id: 879688, display_name: 'Delmas Leo2', club_id: 39, club_name: 'France' },
                    { cust_id: 653413, display_name: 'Xavier Seynave', club_id: 15, club_name: 'Canada' },
                    { cust_id: 878797, display_name: 'Jace Meyer', club_id: 26, club_name: 'Illinois' },
                    { cust_id: 404668, display_name: 'Felipe Sarkis', club_id: 45, club_name: 'Brazil' },
                    { cust_id: 736836, display_name: 'Craig Bryk', club_id: 22, club_name: 'Florida' },
                    { cust_id: 569413, display_name: 'Michael Fairchild', club_id: 30, club_name: 'Texas' },
                    { cust_id: 132921, display_name: 'Carl Hartwell', club_id: 17, club_name: 'Virginias' },
                    { cust_id: 909846, display_name: 'David Iezzi', club_id: 25, club_name: 'Carolina' },
                    { cust_id: 928442, display_name: 'Christian Judkins', club_id: 32, club_name: 'West' },
                    { cust_id: 174470, display_name: 'Arturo Mayorga', club_id: 14, club_name: 'New York' },
                    { cust_id: 655406, display_name: 'Felipe F Ramos', club_id: 12, club_name: 'New England' },
                    { cust_id: 868186, display_name: 'Derek Dopler', club_id: 32, club_name: 'West' },
                    { cust_id: 658392, display_name: 'Richard Ly3', club_id: 23, club_name: 'Mid-South' },
                    { cust_id: 633016, display_name: 'Gareth McAlister', club_id: 34, club_name: 'Australia/NZ' },
                    { cust_id: 196486, display_name: 'Zachary Bowman', club_id: 6, club_name: 'California Club' },
                    { cust_id: 727284, display_name: 'Kyle Deckard', club_id: 28, club_name: 'Michigan' },
                    { cust_id: 375326, display_name: 'Nick Trollmann', club_id: 6, club_name: 'California Club' },
                    { cust_id: 986846, display_name: 'Gael Rolls', club_id: 36, club_name: 'UK and I' },
                    { cust_id: 906412, display_name: 'Matthew Balcells', club_id: 17, club_name: 'Virginias' },
                    { cust_id: 147217, display_name: 'Peter Reitinger', club_id: 38, club_name: 'Iberia' },
                    { cust_id: 554488, display_name: 'Jack Mundy', club_id: 36, club_name: 'UK and I' },
                    { cust_id: 849261, display_name: 'Eric Guillory', club_id: 30, club_name: 'Texas' },
                    { cust_id: 952281, display_name: 'Jason Bagby', club_id: 17, club_name: 'Virginias' },
                    { cust_id: 379025, display_name: 'Eric C Fox', club_id: 25, club_name: 'Carolina' },
                    { cust_id: 557710, display_name: 'Stephen Lichota', club_id: 6, club_name: 'California Club' },
                    { cust_id: 131358, display_name: 'Brian Dawson', club_id: 25, club_name: 'Carolina' },
                    { cust_id: 420622, display_name: 'Devin W Hughes', club_id: 6, club_name: 'California Club' },
                    { cust_id: 615385, display_name: 'Jacob Bramley', club_id: 6, club_name: 'California Club' },
                    { cust_id: 252005, display_name: 'Kyle Bastos', club_id: 12, club_name: 'New England' },
                    { cust_id: 278262, display_name: 'Norman King', club_id: 23, club_name: 'Mid-South' },
                    { cust_id: 556375, display_name: 'Matt R Foster', club_id: 32, club_name: 'West' },
                    { cust_id: 828330, display_name: 'Evan Alexander', club_id: 15, club_name: 'Canada' },
                    { cust_id: 875586, display_name: 'Julian Flores', club_id: 18, club_name: 'Atlantic' },
                ],
            };
        }

        return null;
    }),
}));

describe('page-data', () => {
    test('Retrieve the home page data', async () => {
        let page = await getPageData({ m: 'home', league: '4534' });
        expect(page).toEqual(PAGE_DATA_HOME);
    }, 6000);

    test('Retrieve the standings page data', async () => {
        let page = await getPageData({ m: 'standings', league: '4534' });
        expect(page).toEqual(PAGE_DATA_STANDINGS);
    }, 6000);
});
