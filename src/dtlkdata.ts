import { isDeepStrictEqual } from 'util';
import {
    getBlockedSeasonsAsync,
    getLapChartDataAsync,
    getLeagueSeasonsAsync,
    getLeagueSeasonSessionsAsync,
    getMembersDataAsync,
} from './ldata-loaders/iracing-scraped-data-loader';
import {
    getLeagueDriverStatsAsync,
    getLeagueSubsessionIndexAsync,
    getSimSessionResultsAsync,
    getSingleMemberDataAsync,
} from './ldata-loaders/iracing-derived-data-loader';
import { getStewardRulingsAsync } from './ldata-loaders/ldata-stward-data-loader';
import { getSimsessionSummaryAsync } from './ldata-loaders/ldata-gentxt-data-loader';
import { getTelemetrySubsessionsAsync } from './ldata-loaders/ldata-irrpy-data-loader';
import {
    getCumulativeDeltaChartDataAsync,
    getStartFinishChartDataAsync,
} from './ldata-loaders/ldata-chart-data-loader';

type Query = { [name: string]: string | number };

// Sentinel returned by getFromLoader when no switch case matched the
// (namespace, type) pair. Distinguishable from `null` (which the loader
// itself returns when an on-disk read fails). getDocument uses this to log
// a separate UNHANDLED warning so an uncatalogued endpoint can never recur
// invisibly, even if the static manifest drifts.
export const UNHANDLED: unique symbol = Symbol('unhandled-namespace');
export type Unhandled = typeof UNHANDLED;

function num(v: string | number | undefined): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Legacy URL fetch — preserved verbatim during the shadow-mode rollout so the
// caller sees byte-for-byte identical data while we observe loader parity in
// production. Delete this branch (and switch `getDocument` to return the
// loader result) once divergence logs are clean.
// ---------------------------------------------------------------------------

const URL_BASE = 'https://arturo-mayorga.github.io/irl_stats/dist/data';

function ldArg(arg: string | number | undefined): string {
    return arg ? '/' + arg : '';
}

function nNums(s: string): string {
    return s.replace('-', 'n');
}

function legacyUrl(query: Query): string {
    return (
        `${URL_BASE}/${query.namespace}/${query.type}` +
        `${ldArg(query.league)}` +
        `${ldArg(query.season)}` +
        `${ldArg(query.subsession)}` +
        `${nNums(ldArg(query.simsession))}` +
        `${ldArg(query.driver)}` +
        `${ldArg(query.car)}` +
        `${ldArg(query.track)}` +
        `${ldArg(query.sessionType)}` +
        `${ldArg(query.custId)}` +
        `.json`
    );
}

export async function getFromUrl(query: Query): Promise<any> {
    try {
        const res = await fetch(legacyUrl(query));
        return await res.json();
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Loader-backed dispatch — routes (namespace, type) to the typed loader for
// that dataset. Exported for tests and the parity script; not re-exported
// from src/index.ts (the public surface is `getDocument` only).
//
// Returns the loader's result on a matched case (which may be null if the
// underlying read failed), or UNHANDLED if no case matched. Callers must
// distinguish these — see getDocument for the runtime backstop.
// ---------------------------------------------------------------------------

export async function getFromLoader(query: Query): Promise<any | Unhandled> {
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
        case 'ldata-rsltsts/singleMemberData': {
            const driver = num(query.driver);
            if (driver === null) return null;
            return await getSingleMemberDataAsync(driver);
        }
        case 'ldata-rsltsts/simSessionResults': {
            const subsession = num(query.subsession);
            const simsession = num(query.simsession);
            if (subsession === null || simsession === null) return null;
            return await getSimSessionResultsAsync(subsession, simsession);
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
        case 'ldata-irrpy/telemetrySubsessions': {
            const league = num(query.league);
            if (league === null) return null;
            return await getTelemetrySubsessionsAsync(league);
        }
        case 'ldata-charts/startFinishChartData': {
            const league = num(query.league);
            const subsession = num(query.subsession);
            const simsession = num(query.simsession);
            if (
                league === null ||
                subsession === null ||
                simsession === null
            )
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
            if (
                league === null ||
                subsession === null ||
                simsession === null
            )
                return null;
            return await getCumulativeDeltaChartDataAsync(
                league,
                subsession,
                simsession
            );
        }
    }

    return UNHANDLED;
}

// ---------------------------------------------------------------------------
// Shadow-mode dispatcher
// ---------------------------------------------------------------------------
// Runs both sources in parallel and returns the URL result so callers see
// the legacy behavior unchanged. Any divergence is logged for ops to
// investigate. Loader-side exceptions are swallowed — a bug in the loader
// path must never affect what the caller receives.
// ---------------------------------------------------------------------------

function queryKeys(query: Query): string {
    return Object.entries(query)
        .filter(([k]) => k !== 'namespace' && k !== 'type')
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
}

function logDivergence(query: Query, urlData: any, loaderData: any): void {
    const ns = String(query.namespace ?? '');
    const type = String(query.type ?? '');
    const keys = queryKeys(query);

    let detail: string;
    if (urlData === null && loaderData !== null) {
        detail = 'url=null loader=non-null';
    } else if (urlData !== null && loaderData === null) {
        detail = 'url=non-null loader=null';
    } else {
        detail = 'shape/value mismatch';
    }

    console.warn(`:: dataLake DIVERGENCE [${ns}/${type}] ${keys} (${detail})`);
}

export async function getDocument(query: Query): Promise<any> {
    const ns = String(query.namespace ?? '');
    const type = String(query.type ?? '');
    console.log(`:: dataLake: ${ns}/${type}`);

    const [urlData, loaderResult] = await Promise.all([
        getFromUrl(query),
        getFromLoader(query).catch(() => null),
    ]);

    if (loaderResult === UNHANDLED) {
        // Distinct signal from "loader returned null" — this means the
        // (namespace, type) pair has no dispatcher case at all. The static
        // manifest may be missing it, or the consumer is querying something
        // we never catalogued. Either way, ops needs to know.
        const keys = queryKeys(query);
        console.warn(`:: dataLake UNHANDLED [${ns}/${type}] ${keys}`);
    } else if (!isDeepStrictEqual(urlData, loaderResult)) {
        logDivergence(query, urlData, loaderResult);
    }

    return urlData;
}
