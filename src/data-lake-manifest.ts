// =============================================================================
// Data-lake endpoint manifest — the single source of truth for which
// (namespace, type) pairs the data-lake dispatcher in `src/dtlkdata.ts` is
// responsible for. `data-catalog/data-catalog.md` is descriptive prose only;
// this file is the contract enforced by the test suite. Do NOT add an
// endpoint in two places.
//
// New endpoints get listed here FIRST, before the dispatcher case is added —
// the regression test in `src/dtlkdata.coverage.test.ts` will fail loudly
// until both halves of the wiring exist.
//
// Notes for adding entries:
//
//   - `exampleQuery` must satisfy the dispatcher's input guards (e.g. the
//     `num()` coercion on numeric keys). If a required key is missing or
//     non-numeric, the dispatcher bails out before reaching the loader call
//     and the coverage test fails with a misleading null.
//
//   - If an endpoint is intentionally not wired into the shadow-mode
//     dispatcher (e.g. its on-disk source isn't ready yet), set the
//     `unshadowed` field with a brief reason. The coverage test then asserts
//     the dispatcher returns null for that case, so the exemption is
//     explicit and reviewable.
// =============================================================================

export type DataLakeEndpoint = {
    namespace: string;
    type: string;
    // A query whose required keys are all present, so the dispatcher can
    // reach the loader call (instead of bailing in num()-coercion guards).
    exampleQuery: { [k: string]: string | number };
    // Set when an endpoint is catalogued but deliberately not wired into
    // the dispatcher. The coverage test will assert the dispatcher returns
    // null for these. Forces a conscious, reviewable exemption.
    unshadowed?: { reason: string };
};

export const DATA_LAKE_ENDPOINTS: ReadonlyArray<DataLakeEndpoint> = [
    {
        namespace: 'ldata-irweb',
        type: 'leagueSeasonSessions',
        exampleQuery: { league: 4534, season: 105035 },
    },
    {
        namespace: 'ldata-irweb',
        type: 'leagueSeasons',
        exampleQuery: { league: 4534 },
    },
    {
        namespace: 'ldata-irweb',
        type: 'membersData',
        exampleQuery: { league: 4534, season: 105035 },
    },
    {
        namespace: 'ldata-irweb',
        type: 'blockedSeasons',
        exampleQuery: {},
    },
    {
        namespace: 'ldata-rsltsts',
        type: 'leagueDriverStats',
        exampleQuery: { league: 4534 },
    },
    {
        namespace: 'ldata-rsltsts',
        type: 'leagueSimsessionIndex',
        exampleQuery: { league: 4534 },
    },
    {
        namespace: 'ldata-rsltsts',
        type: 'singleMemberData',
        // The dispatcher accepts `custId` or `driver` (aliases). `custId` is
        // the canonical name used by the REST API and the loader signature.
        exampleQuery: { custId: 12345 },
    },
    {
        namespace: 'ldata-rsltsts',
        type: 'trackInfoDirectory',
        exampleQuery: { league: 4534 },
    },
    {
        namespace: 'ldata-rsltsts',
        type: 'trackResults',
        exampleQuery: { league: 4534, car: 106, track: 341 },
    },
    {
        namespace: 'ldata-stward',
        type: 'rulings',
        exampleQuery: { league: 6555, season: 99410 },
    },
    {
        namespace: 'ldata-irweb',
        type: 'lapChartData',
        exampleQuery: { subsession: 85056343, simsession: 0 },
    },
    {
        namespace: 'ldata-rsltsts',
        type: 'simSessionResults',
        exampleQuery: { subsession: 85228727, simsession: 0 },
    },
    {
        namespace: 'ldata-gentxt',
        type: 'simsessionSummary',
        exampleQuery: { subsession: 85228727, simsession: 0 },
    },
    {
        namespace: 'ldata-irrpy',
        type: 'telemetrySubsessions',
        exampleQuery: { league: 4534 },
    },
    {
        namespace: 'ldata-charts',
        type: 'startFinishChartData',
        exampleQuery: { league: 4534, subsession: 85056343, simsession: 0 },
    },
    {
        namespace: 'ldata-charts',
        type: 'cumulativeDeltaChartData',
        exampleQuery: { league: 4534, subsession: 85056343, simsession: 0 },
    },
    {
        namespace: 'ldata-charts',
        type: 'pacePercentChartData',
        exampleQuery: { league: 4534, subsession: 85228727, simsession: -3 },
    },
    {
        namespace: 'ldata-irweb',
        type: 'leagueRoster',
        exampleQuery: { league: 4534 },
    },
    {
        namespace: 'ldata-rsltsts',
        type: 'driverSessionResults',
        exampleQuery: { league: 4534, sessionType: 'race', custId: 555362 },
    },
    {
        namespace: 'ldata-gentxt',
        type: 'dotdProfile',
        exampleQuery: { league: 4534, custId: 555362 },
    },
];
