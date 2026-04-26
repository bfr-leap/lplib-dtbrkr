import {
    getLeagueSeasonsAsync,
    getLeagueSeasonSessionsAsync,
    getMembersDataAsync,
} from './ldata-loaders/iracing-scraped-data-loader';
import {
    getLeagueDriverStatsAsync,
    getSingleMemberDataAsync,
} from './ldata-loaders/iracing-derived-data-loader';
import { getStewardRulingsAsync } from './ldata-loaders/ldata-stward-data-loader';

type Query = { [name: string]: string | number };

function num(v: string | number | undefined): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export async function getDocument(query: Query): Promise<any> {
    const ns = String(query.namespace ?? '');
    const type = String(query.type ?? '');
    console.log(`:: dataLake: ${ns}/${type}`);

    switch (`${ns}/${type}`) {
        case 'ldata-irweb/leagueSeasonSessions': {
            const league = num(query.league);
            const season = num(query.season);
            if (league === null || season === null) return null;
            return await getLeagueSeasonSessionsAsync(league, season);
        }
        case 'ldata-irweb/leagueSeasons': {
            const league = num(query.league);
            if (league === null) return null;
            return await getLeagueSeasonsAsync(league);
        }
        case 'ldata-irweb/membersData': {
            const league = num(query.league);
            const season = num(query.season);
            if (league === null || season === null) return null;
            return await getMembersDataAsync(league, season);
        }
        case 'ldata-rsltsts/leagueDriverStats': {
            const league = num(query.league);
            if (league === null) return null;
            return await getLeagueDriverStatsAsync(league);
        }
        case 'ldata-rsltsts/singleMemberData': {
            const driver = num(query.driver);
            if (driver === null) return null;
            return await getSingleMemberDataAsync(driver);
        }
        case 'ldata-stward/rulings': {
            const league = num(query.league);
            const season = num(query.season);
            if (league === null || season === null) return null;
            return await getStewardRulingsAsync(league, season);
        }
    }

    return null;
}
