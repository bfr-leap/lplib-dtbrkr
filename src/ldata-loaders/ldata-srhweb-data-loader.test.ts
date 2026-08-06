jest.mock('fs');
jest.mock('fs/promises');
jest.mock('./kafka-notify', () => ({ notifyWrite: jest.fn() }));

import {
    readFileSync,
    writeFileSync,
    existsSync,
    statSync,
    readdirSync,
} from 'fs';
import { readFile } from 'fs/promises';
import {
    getSeasonInfo,
    getSeasonInfoAsync,
    saveSeasonInfo,
    getSeasonStandings,
    getSeasonStandingsAsync,
    saveSeasonStandings,
    getRaceResults,
    getRaceResultsAsync,
    saveRaceResults,
    getRaceAdjudications,
    getRaceAdjudicationsAsync,
    saveRaceAdjudications,
    listRaceSessions,
    listRacedSessions,
    listLeagueIds,
    listSeasonCustIds,
    listSeasonIds,
} from './ldata-srhweb-data-loader';
import type { SeasonInfo } from './ldata-srhweb-data-loader';

const MNT = './public/data/ldata-srhweb/';

beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue('{}');
    (readFile as jest.Mock).mockResolvedValue('{}');
    // Force `ldataWriteFile`'s byte-comparison to miss, so writes go through.
    (statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT');
    });
});

// A two-event season: the first ran heats (a race at session -2 alongside the
// feature at 0), the second has not been run at all.
const SEASON: SeasonInfo = {
    season_id: 134456,
    season_name: 'Season 19',
    league_id: 4534,
    league_name: 'League Zero',
    series_name: 'Formula Series',
    drop_weeks: 1,
    keep_weeks: 4,
    allow_negative_race_points: true,
    allow_negative_standings_points: true,
    classes: [{ class_id: 0, class_name: 'Overall' }],
    schedule: [
        {
            subsession_id: 87253846,
            sessions: [
                {
                    simsession_number: -2,
                    session_type: 'RACE',
                    is_race: true,
                },
                {
                    simsession_number: -1,
                    session_type: 'OPEN PRACTICE',
                    is_race: false,
                },
                {
                    simsession_number: 0,
                    session_type: 'RACE',
                    is_race: true,
                },
            ],
            race_date: 1784174400,
            track: {
                track_id: 266,
                config_id: 444,
                track_name: 'Fuji International Speedway',
                config_name: 'Grand Prix',
                length_km: 4.563,
                turns: 16,
            },
            event_name: null,
            is_chase: false,
            can_drop: true,
            counts_for_points: true,
        },
        {
            subsession_id: null,
            sessions: [],
            race_date: 1788408000,
            track: {
                track_id: 39,
                config_id: 59,
                track_name: '[Legacy] Silverstone Circuit - 2008',
                config_name: 'Grand Prix',
                length_km: 5.891,
                turns: 18,
            },
            event_name: null,
            is_chase: false,
            can_drop: true,
            counts_for_points: true,
        },
    ],
    drivers: {
        '314637': {
            cust_id: 314637,
            display_name: 'Antonio Bianchi',
            sort_name: 'Bianchi, Antonio',
            country_code: 'CA',
        },
    },
};

describe('addressing', () => {
    it('keys season info by iRacing league and season', () => {
        getSeasonInfo(4534, 134456);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}seasonInfo/4534/134456.json`,
            expect.anything()
        );
    });

    it('keys standings by league, season and class', () => {
        getSeasonStandings(4534, 134456, 0);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}seasonStandings/4534/134456/0.json`,
            expect.anything()
        );
    });

    it('keys race data by subsession and simsession, as ldata-irweb does', () => {
        getRaceResults(87253846, 0);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}raceResults/87253846/0.json`,
            expect.anything()
        );

        getRaceAdjudications(87253846, 0);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}raceAdjudications/87253846/0.json`,
            expect.anything()
        );
    });

    it('encodes a negative simsession number with the n prefix', () => {
        // Heats live at negative session numbers, and `fsutil` encodes them
        // the same way `ldata-irweb` stores lapChartData.
        getRaceResults(87253846, -2);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}raceResults/87253846/n2.json`,
            expect.anything()
        );
    });

    it('addresses the same paths asynchronously', async () => {
        await getSeasonInfoAsync(4534, 134456);
        await getSeasonStandingsAsync(4534, 134456, 0);
        await getRaceResultsAsync(87253846, 0);
        await getRaceAdjudicationsAsync(87253846, 0);

        const paths = (readFile as jest.Mock).mock.calls.map((c) => c[0]);
        expect(paths).toEqual([
            `${MNT}seasonInfo/4534/134456.json`,
            `${MNT}seasonStandings/4534/134456/0.json`,
            `${MNT}raceResults/87253846/0.json`,
            `${MNT}raceAdjudications/87253846/0.json`,
        ]);
    });

    it('returns null for a dataset that is not mounted', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getSeasonInfo(4534, 134456)).toBeNull();
        expect(getRaceResults(87253846, 0)).toBeNull();
    });
});

describe('writing', () => {
    it('writes each collection to its keyed path', () => {
        saveSeasonInfo(4534, 134456, SEASON);
        saveSeasonStandings(4534, 134456, 0, {
            league_id: 4534,
            season_id: 134456,
            class_id: 0,
            drivers: {},
            teams: {},
        });
        saveRaceResults(87253846, -2, {
            subsession_id: 87253846,
            league_id: 4534,
            season_id: 134456,
            simsession_number: -2,
            session_type: 'RACE',
            is_race: true,
            race_date: 1784174400,
            results: {},
        });
        saveRaceAdjudications(87253846, -2, {
            subsession_id: 87253846,
            simsession_number: -2,
            penalties: [],
            bonuses: [],
        });

        const paths = (writeFileSync as jest.Mock).mock.calls.map((c) => c[0]);
        expect(paths).toEqual([
            `${MNT}seasonInfo/4534/134456.json`,
            `${MNT}seasonStandings/4534/134456/0.json`,
            `${MNT}raceResults/87253846/n2.json`,
            `${MNT}raceAdjudications/87253846/n2.json`,
        ]);
    });
});

describe('listSeasonIds', () => {
    it('reads the seasons off the dataset rather than a manifest', () => {
        (readdirSync as jest.Mock).mockReturnValue([
            '29897.json',
            '31022.json',
        ]);
        expect(listSeasonIds(4534)).toEqual([29897, 31022]);
        expect(readdirSync).toHaveBeenCalledWith(`${MNT}seasonInfo/4534`);
    });

    it('sorts ascending regardless of listing order', () => {
        (readdirSync as jest.Mock).mockReturnValue([
            '31022.json',
            '29897.json',
        ]);
        expect(listSeasonIds(4534)).toEqual([29897, 31022]);
    });

    it('ignores entries that are not season files', () => {
        (readdirSync as jest.Mock).mockReturnValue([
            '29897.json',
            'README.md',
            '.gitkeep',
        ]);
        expect(listSeasonIds(4534)).toEqual([29897]);
    });

    it('returns nothing when the dataset is not mounted yet', () => {
        // The first run, before any scrape — not an error.
        (existsSync as jest.Mock).mockReturnValue(false);
        expect(listSeasonIds(4534)).toEqual([]);
        expect(readdirSync).not.toHaveBeenCalled();
    });
});

describe('listRaceSessions', () => {
    it('returns every resolved session as a subsession/simsession pair', () => {
        expect(listRaceSessions(SEASON)).toEqual([
            [87253846, -2],
            [87253846, -1],
            [87253846, 0],
        ]);
    });

    it('skips events with no resolved subsession', () => {
        // The second event has none — either unrun, or ldata-irweb has not
        // caught up. Nothing about it can be keyed in iRacing terms.
        expect(listRaceSessions(SEASON)).toHaveLength(3);
    });
});

describe('listRacedSessions', () => {
    it('includes the heat, which is a race at a negative session number', () => {
        // The whole point: a season scoring heats runs two races per event,
        // and filtering on the session number would drop one of them.
        expect(listRacedSessions(SEASON)).toEqual([
            [87253846, -2],
            [87253846, 0],
        ]);
    });

    it('leaves out practice and qualifying', () => {
        expect(listRacedSessions(SEASON)).not.toContainEqual([87253846, -1]);
    });
});

describe('listLeagueIds', () => {
    it('reads the leagues off the dataset', () => {
        (readdirSync as jest.Mock).mockReturnValue(['4534', '6555']);
        expect(listLeagueIds()).toEqual([4534, 6555]);
        expect(readdirSync).toHaveBeenCalledWith(`${MNT}seasonInfo`);
    });
});

describe('listSeasonCustIds', () => {
    it('carries only drivers with an iRacing identity', () => {
        // AI drivers are dropped by the producer, since a dataset keyed by
        // cust_id has nowhere to file them.
        expect(listSeasonCustIds(SEASON)).toEqual([314637]);
    });
});
