import {
    getBlockedSeasonsAsync,
    getLapChartDataAsync,
    getLeagueRosterAsync,
    getLeagueSeasonsAsync,
    getLeagueSeasonSessionsAsync,
    getMembersDataAsync,
} from './ldata-loaders/iracing-scraped-data-loader';
import {
    getDriverSessionResultsAsync,
    getLeagueDriverStatsAsync,
    getLeagueSubsessionIndexAsync,
    getSimSessionResultsAsync,
    getSingleMemberDataAsync,
    getTrackInfoDirectoryAsync,
    getTrackResultsAsync,
} from './ldata-loaders/iracing-derived-data-loader';
import { getStewardRulingsAsync } from './ldata-loaders/ldata-stward-data-loader';
import {
    getCumulativeDeltaChartDataAsync,
    getPacePercentChartDataAsync,
    getStartFinishChartDataAsync,
} from './ldata-loaders/ldata-chart-data-loader';
import {
    getDotdProfileAsync,
    getSimsessionSummaryAsync,
} from './ldata-loaders/ldata-gentxt-data-loader';
import { getTelemetrySubsessionsAsync } from './ldata-loaders/ldata-irrpy-data-loader';

// Sentinel returned by `getFromLoader` when no dispatcher case matches the
// requested (namespace, type). Distinct from a loader returning `null`, which
// means "loader exists, no data on disk for this query." Surfacing the
// difference at runtime lets `getDocument` log uncatalogued endpoints with a
// dedicated `UNHANDLED` warning and return null rather than silently serving
// nothing.
export const UNHANDLED = Symbol('dataLake.unhandled');

type Query = { [name: string]: string | number };

function num(v: string | number | undefined): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Loader-backed dispatch — routes (namespace, type) to the typed loader for
// that dataset. Exported for tests; not re-exported from src/index.ts (the
// public surface is `getDocument` only).
// ---------------------------------------------------------------------------

export async function getFromLoader(
    query: Query
): Promise<any | typeof UNHANDLED> {
    const ns = String(query.namespace ?? '');
    const type = String(query.type ?? '');

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
        case 'ldata-irweb/blockedSeasons': {
            return await getBlockedSeasonsAsync();
        }
        case 'ldata-irweb/lapChartData': {
            const subsession = num(query.subsession);
            const simsession = num(query.simsession);
            if (subsession === null || simsession === null) return null;
            return await getLapChartDataAsync(subsession, simsession);
        }
        case 'ldata-irweb/leagueRoster': {
            const league = num(query.league);
            if (league === null) return null;
            return await getLeagueRosterAsync(league);
        }
        case 'ldata-rsltsts/leagueDriverStats': {
            const league = num(query.league);
            if (league === null) return null;
            return await getLeagueDriverStatsAsync(league);
        }
        case 'ldata-rsltsts/leagueSimsessionIndex': {
            const league = num(query.league);
            if (league === null) return null;
            return await getLeagueSubsessionIndexAsync(league);
        }
        case 'ldata-rsltsts/trackInfoDirectory': {
            const league = num(query.league);
            if (league === null) return null;
            return await getTrackInfoDirectoryAsync(league);
        }
        case 'ldata-rsltsts/trackResults': {
            const league = num(query.league);
            const car = num(query.car);
            const track = num(query.track);
            if (league === null || car === null || track === null) return null;
            return await getTrackResultsAsync(league, car, track);
        }
        case 'ldata-rsltsts/singleMemberData': {
            // Production callers use either `custId` (REST API + the
            // upstream loader signature) or `driver` (some internal page-data
            // helpers) to identify the member. Accept both — they're aliases
            // for the same iRacing customer ID.
            const id = num(query.custId ?? query.driver);
            if (id === null) return null;
            return await getSingleMemberDataAsync(id);
        }
        case 'ldata-rsltsts/simSessionResults': {
            const subsession = num(query.subsession);
            const simsession = num(query.simsession);
            if (subsession === null || simsession === null) return null;
            return await getSimSessionResultsAsync(subsession, simsession);
        }
        case 'ldata-rsltsts/driverSessionResults': {
            const league = num(query.league);
            const custId = num(query.custId);
            const sessionType =
                query.sessionType === undefined
                    ? null
                    : String(query.sessionType);
            if (league === null || custId === null || !sessionType) return null;
            return await getDriverSessionResultsAsync(
                league,
                sessionType,
                custId
            );
        }
        case 'ldata-stward/rulings': {
            const league = num(query.league);
            const season = num(query.season);
            if (league === null || season === null) return null;
            return await getStewardRulingsAsync(league, season);
        }
        case 'ldata-gentxt/simsessionSummary': {
            const subsession = num(query.subsession);
            const simsession = num(query.simsession);
            if (subsession === null || simsession === null) return null;
            return await getSimsessionSummaryAsync(subsession, simsession);
        }
        case 'ldata-gentxt/dotdProfile': {
            const league = num(query.league);
            const custId = num(query.custId);
            if (league === null || custId === null) return null;
            return await getDotdProfileAsync(league, custId);
        }
        case 'ldata-irrpy/telemetrySubsessions': {
            const league = num(query.league);
            if (league === null) return null;
            return await getTelemetrySubsessionsAsync(league);
        }
        case 'ldata-charts/startFinishChartData': {
            const league = num(query.league);
            const subsession = num(query.subsession);
            const simsession = num(query.simsession);
            if (league === null || subsession === null || simsession === null)
                return null;
            return await getStartFinishChartDataAsync(
                league,
                subsession,
                simsession
            );
        }
        case 'ldata-charts/cumulativeDeltaChartData': {
            const league = num(query.league);
            const subsession = num(query.subsession);
            const simsession = num(query.simsession);
            if (league === null || subsession === null || simsession === null)
                return null;
            return await getCumulativeDeltaChartDataAsync(
                league,
                subsession,
                simsession
            );
        }
        case 'ldata-charts/pacePercentChartData': {
            const league = num(query.league);
            const subsession = num(query.subsession);
            const simsession = num(query.simsession);
            if (league === null || subsession === null || simsession === null)
                return null;
            return await getPacePercentChartDataAsync(
                league,
                subsession,
                simsession
            );
        }
    }

    return UNHANDLED;
}

function logUnhandled(query: Query): void {
    const ns = String(query.namespace ?? '');
    const type = String(query.type ?? '');
    const keys = Object.entries(query)
        .filter(([k]) => k !== 'namespace' && k !== 'type')
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
    console.warn(`:: dataLake UNHANDLED [${ns}/${type}] ${keys}`);
}

export async function getDocument(query: Query): Promise<any> {
    const ns = String(query.namespace ?? '');
    const type = String(query.type ?? '');
    console.log(`:: dataLake: ${ns}/${type}`);

    const result = await getFromLoader(query);

    if (result === UNHANDLED) {
        logUnhandled(query);
        return null;
    }

    return result;
}
