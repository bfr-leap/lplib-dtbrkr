/**
 *
 * Accessors for `ldata-srhweb` — league standings, race results and stewarding
 * adjudications scraped from simracerhub.com by the `dprdc-srhweb` producer.
 *
 * simracerhub is a third-party scoring site with no API. The producer reads
 * its React page payloads and adapts them into the shapes below, so nothing
 * in this dataset carries simracerhub's own field names, units or string-typed
 * numerics — see `dprdc-srhweb/src/srhub/srhub-adapter.ts` for the mapping and
 * the reasoning behind each rename.
 *
 * Four collections, keyed the way the rest of the lake is keyed:
 *
 *     seasonInfo/<leagueID>/<seasonID>.json
 *     seasonStandings/<leagueID>/<seasonID>/<classID>.json
 *     raceResults/<subsessionID>/<simsessionNumber>.json
 *     raceAdjudications/<subsessionID>/<simsessionNumber>.json
 *
 * Every identifier here is **iRacing's** — `league_id`, `season_id`,
 * `subsession_id`, `simsession_number`, `cust_id` — so iRacing-aware software
 * can read this dataset without a lookup table. simracerhub's own IDs are
 * translated by the producer on the way in and not persisted.
 *
 * `seasonInfo` is the entry point: it carries the class list needed to address
 * `seasonStandings`, and the schedule that maps a season onto the race IDs
 * addressing `raceResults` and `raceAdjudications`.
 *
 * simracerhub passes iRacing's `simsession_number` through unchanged, so the
 * producer only has to resolve the `subsession_id` that completes the key,
 * which it does against `ldata-irweb` by track and date. A race simracerhub
 * has scored is therefore absent here until iRacing's copy has been scraped;
 * it appears on a later run. `EventSession` documents how the two number and
 * name their sessions, and why heats make `is_race` load-bearing.
 *
 * Drivers are keyed by `cust_id`, the same key `ldata-irweb` uses under
 * `membersData/`. AI drivers have no iRacing identity and are left out.
 *
 * Lap times are in 10,000ths of a second throughout, matching
 * `ldata-rsltsts`. simracerhub reports them inconsistently (decimal seconds
 * on the race page, whole seconds in the standings payload, 10,000ths for
 * `avg_fast_lap`); the producer normalises before writing.
 *
 * This dataset is producer-written. The write path lives here rather than in
 * the producer so the shape and its accessors stay in one place.
 *
 */

import { existsSync, readdirSync } from 'fs';

import { ldataReadFile, ldataReadFileAsync, ldataWriteFile } from './fsutil';

// TODO(upstream): move these interfaces to `ir-endpoint-types`. They are
// pinned by the contract schema at `contracts/schemas/ldata-srhweb.schema.json`.

/**
 * A driver in a season.
 *
 * AI drivers exist in simracerhub but have no iRacing identity, so they
 * cannot be keyed by `cust_id` and are not carried here.
 */
export interface SeasonDriver {
    // The iRacing customer ID — this dataset's driver key throughout, and the
    // join into `ldata-irweb` under `membersData/`.
    cust_id: number;
    display_name: string;
    // "Last, First" — simracerhub's own sort key, kept because it is not
    // always derivable from `display_name`.
    sort_name: string;
    // ISO 3166-1 alpha-2, or null when the driver has set no flag.
    country_code: string | null;
}

/**
 * A sim session, as `[subsession_id, simsession_number]` — the key pair
 * `ldata-irweb` and `ldata-rsltsts` use.
 */
export type SessionKey = [number, number];

export interface SeasonClass {
    class_id: number;
    class_name: string;
}

export interface SeasonTrack {
    // iRacing's track and configuration IDs. `config_id` is what
    // `ldata-irweb` calls `track_id` on a session; `track_id` is the parent
    // circuit. Null where simracerhub has not mapped the track to iRacing,
    // which is also when its events cannot be resolved to a subsession.
    track_id: number | null;
    config_id: number | null;
    track_name: string;
    config_name: string;
    // Kilometres, as published by simracerhub. Null when unset.
    length_km: number | null;
    turns: number | null;
}

/**
 * One sim session of an event.
 *
 * `simsession_number` is iRacing's, passed through by simracerhub unchanged:
 * 0 is the closing race and earlier sessions count backwards from it. Lining
 * the two up on a heat-racing event:
 *
 *     simsession_number   ldata-irweb name   simracerhub session_type
 *     -4                  PRACTICE           OPEN PRACTICE
 *     -3                  QUALIFY            OPEN QUALIFYING
 *     -2                  HEAT 1             RACE
 *     -1                  WARMUP             OPEN PRACTICE
 *      0                  FEATURE            RACE
 *
 * So a negative session number does not mean "not a race" — an event running
 * heats scores championship points at session -2. `is_race` is the flag to
 * branch on; it corresponds to iRacing's `simsession_type` 6, which covers
 * the names RACE, HEAT 1 and FEATURE.
 *
 * Session counts vary by event: a plain race weekend runs -2..0, a heat
 * weekend -4..0. Only session 0 is guaranteed to exist.
 */
export interface EventSession {
    // With the event's `subsession_id`, addresses `raceResults` and
    // `raceAdjudications` — and is the same sim-session key `ldata-irweb`
    // and `ldata-rsltsts` use.
    simsession_number: number;
    // simracerhub's own label: RACE, OPEN QUALIFYING, OPEN PRACTICE.
    session_type: string;
    is_race: boolean;
}

/**
 * One event on the season calendar.
 *
 * `subsession_id` is null for an event that has not been run, and also for
 * one simracerhub has scored but `ldata-irweb` has not caught up with — the
 * producer skips those rather than keying them on anything else, so their
 * sessions carry no results until a later run resolves them.
 */
export interface ScheduledEvent {
    // The iRacing subsession this event was run as, once resolvable.
    subsession_id: number | null;
    // Every session the event has run, in session order. Empty until the
    // event is both run and resolved.
    sessions: EventSession[];
    // Epoch seconds.
    race_date: number;
    track: SeasonTrack;
    event_name: string | null;
    is_chase: boolean;
    // Whether this event is eligible to be dropped under the season's
    // drop-week rules, and whether it scores points at all.
    can_drop: boolean;
    counts_for_points: boolean;
}

/**
 * Season identity, scoring rules, calendar and driver roster.
 */
export interface SeasonInfo {
    // iRacing's IDs. simracerhub's own season and league keys are resolved
    // away by the producer and not carried.
    season_id: number;
    season_name: string;
    league_id: number;
    league_name: string;
    // The simracerhub series this season belongs to. iRacing has no series
    // concept, so only the name survives the translation — it is the sole
    // handle for grouping a league's seasons into championships.
    series_name: string;
    // Scoring rules. `drop_weeks` is how many of a driver's worst results are
    // discarded; `keep_weeks` how many are kept. Null when the season sets
    // no such rule.
    drop_weeks: number | null;
    keep_weeks: number | null;
    // Whether the season allows a negative points total to stand, per race
    // and in the standings.
    allow_negative_race_points: boolean;
    allow_negative_standings_points: boolean;
    // Always at least one entry. Single-class seasons carry the synthetic
    // class 0, named "Overall" by simracerhub.
    classes: SeasonClass[];
    schedule: ScheduledEvent[];
    drivers: { [cust_id: string]: SeasonDriver };
}

/**
 * A driver's championship position and season totals.
 */
export interface DriverStanding {
    cust_id: number;
    position: number;
    // The driver's position before the most recent event, and the change
    // between the two. Positive `position_change` means they gained places.
    position_previous: number;
    position_change: number;
    total_points: number;
    race_points: number;
    bonus_points: number;
    penalty_points: number;
    stage_points: number;
    starts: number;
    wins: number;
    stage_wins: number;
    poles: number;
    podiums: number;
    top_5: number;
    top_10: number;
    laps: number;
    laps_led: number;
    incidents: number;
    corners: number;
    miles: number;
    // simracerhub's own driver rating for the season.
    rating: number;
    // How many results counted toward `total_points` after drop weeks.
    races_counted: number;
    // The races that scored and the races dropped under the season's
    // drop-week rules, as `[subsession_id, simsession_number]` pairs.
    // Together these are every race the driver started. A race whose
    // subsession is not yet resolvable is absent from both.
    counted_races: SessionKey[];
    dropped_races: SessionKey[];
    // Set while the season is still being scored — the standing is not final.
    is_provisional: boolean;
    car_ids: number[];
}

/**
 * A team's championship position and season totals.
 *
 * Teams score by their drivers' results, so the counting stats here are sums
 * across the roster and can exceed what any one driver ran.
 */
export interface TeamStanding {
    team_id: number;
    team_name: string;
    position: number;
    position_previous: number;
    position_change: number;
    total_points: number;
    race_points: number;
    bonus_points: number;
    penalty_points: number;
    stage_points: number;
    starts: number;
    wins: number;
    stage_wins: number;
    poles: number;
    podiums: number;
    top_5: number;
    top_10: number;
    laps: number;
    laps_led: number;
    incidents: number;
    corners: number;
    miles: number;
    races_counted: number;
    is_provisional: boolean;
    // The roster, by iRacing customer ID.
    cust_ids: number[];
    car_ids: number[];
}

export interface SeasonStandings {
    league_id: number;
    season_id: number;
    class_id: number;
    drivers: { [cust_id: string]: DriverStanding };
    // Empty for seasons that do not run a team championship.
    teams: { [team_id: string]: TeamStanding };
}

/**
 * One driver's result in one race session.
 *
 * Lap times are 10,000ths of a second; 0 means no valid lap was set. Position
 * averages are in positions, not times.
 *
 * The race analytics — passes, position averages, fast-lap counts, rating —
 * are nullable, and null is common: simracerhub computes them for race
 * sessions only, so every practice and qualifying row has them empty, as does
 * a race row for a driver who never took the start. They are kept null rather
 * than zeroed because "no passes" and "passes were never counted" are
 * different facts, and a consumer averaging over zeros would quietly skew.
 */
export interface RaceResult {
    cust_id: number;
    car_id: number | null;
    // Named as `ldata-rsltsts` names them, so a consumer reading both does
    // not have to translate: `position` is the finish, `start_position` the
    // grid slot, `laps_completed` the lap count.
    position: number;
    // Position within the driver's class. Equal to `position` in
    // single-class seasons.
    position_class: number | null;
    start_position: number;
    // 10,000ths of a second, or -1 when no lap was set — the same sentinel
    // `ldata-rsltsts` uses for an unknown time.
    qualify_time: number;
    laps_completed: number;
    laps_led: number;
    incidents: number;
    // simracerhub's finishing state, e.g. "Running". Free text set by the
    // scoring system, not a closed set.
    status: string;
    race_points: number;
    bonus_points: number;
    penalty_points: number;
    stage_points: number;
    total_points: number;
    // 10,000ths of a second, -1 when unset. Same field, unit and sentinel as
    // `ldata-rsltsts`.
    fastest_lap_time: number;
    // The average of the laps the driver ran at fast-lap pace — always at or
    // above `fastest_lap_time`.
    avg_fast_lap_time: number | null;
    avg_lap_time: number;
    // How many of the driver's laps counted as fast laps. Deliberately not
    // named `fast_lap`: that field in `ldata-rsltsts` is the lap *number* on
    // which the fastest lap was set, which is a different thing.
    num_fast_laps: number | null;
    avg_pos: number | null;
    // Average running position across the race.
    avg_running_pos: number | null;
    passes: number | null;
    quality_passes: number | null;
    closing_passes: number | null;
    rating: number | null;
    // Whether this result counts toward the driver's season statistics, and
    // whether it survived drop-week selection in the standings.
    counts_toward_stats: boolean;
    counts_toward_standings: boolean;
    is_provisional: boolean;
}

export interface RaceResults {
    subsession_id: number;
    league_id: number;
    season_id: number;
    // iRacing's `simsession_number`, passed through by simracerhub: 0 for the
    // closing race, negative for earlier sessions of the same event — which
    // may themselves be races. See `EventSession`.
    simsession_number: number;
    // simracerhub's session type: "RACE", "OPEN QUALIFYING", "OPEN PRACTICE".
    session_type: string;
    // Whether this session was raced, heats included. Branch on this rather
    // than on `simsession_number`.
    is_race: boolean;
    // Epoch seconds, from the event this session belongs to.
    race_date: number;
    results: { [cust_id: string]: RaceResult };
}

/**
 * A points adjustment applied by a league steward after a race.
 *
 * Penalties and bonuses share a shape upstream and are separated here only by
 * which list they land in. `points` is always the magnitude as published —
 * positive on both sides — so a penalty subtracts and a bonus adds.
 */
export interface RaceAdjudication {
    adjustment_id: number;
    cust_id: number;
    class_id: number;
    points: number;
    // Free text written by the league's stewards, e.g. "Major Penalty" or
    // "Fastest race lap". There is no controlled vocabulary — leagues word
    // these however they like.
    description: string;
}

export interface RaceAdjudications {
    subsession_id: number;
    simsession_number: number;
    penalties: RaceAdjudication[];
    bonuses: RaceAdjudication[];
}

const MNT_PT = './public/data/ldata-srhweb/';
const DATASET_SEASON_INFO = 'seasonInfo';
const DATASET_SEASON_STANDINGS = 'seasonStandings';
const DATASET_RACE_RESULTS = 'raceResults';
const DATASET_RACE_ADJUDICATIONS = 'raceAdjudications';

export function getSeasonInfo(
    leagueId: number,
    seasonId: number
): SeasonInfo | null {
    return ldataReadFile<SeasonInfo>(MNT_PT, DATASET_SEASON_INFO, [
        leagueId,
        seasonId,
    ]);
}

export function getSeasonInfoAsync(
    leagueId: number,
    seasonId: number
): Promise<SeasonInfo | null> {
    return ldataReadFileAsync<SeasonInfo>(MNT_PT, DATASET_SEASON_INFO, [
        leagueId,
        seasonId,
    ]);
}

export function saveSeasonInfo(
    leagueId: number,
    seasonId: number,
    data: SeasonInfo
): void {
    ldataWriteFile(data, MNT_PT, DATASET_SEASON_INFO, [leagueId, seasonId]);
}

export function getSeasonStandings(
    leagueId: number,
    seasonId: number,
    classId: number
): SeasonStandings | null {
    return ldataReadFile<SeasonStandings>(MNT_PT, DATASET_SEASON_STANDINGS, [
        leagueId,
        seasonId,
        classId,
    ]);
}

export function getSeasonStandingsAsync(
    leagueId: number,
    seasonId: number,
    classId: number
): Promise<SeasonStandings | null> {
    return ldataReadFileAsync<SeasonStandings>(
        MNT_PT,
        DATASET_SEASON_STANDINGS,
        [leagueId, seasonId, classId]
    );
}

export function saveSeasonStandings(
    leagueId: number,
    seasonId: number,
    classId: number,
    data: SeasonStandings
): void {
    ldataWriteFile(data, MNT_PT, DATASET_SEASON_STANDINGS, [
        leagueId,
        seasonId,
        classId,
    ]);
}

// Negative simsession numbers are encoded `n<abs>` by `fsutil`, matching how
// `ldata-irweb` stores `lapChartData/<subsession>/<simsession>.json`.
export function getRaceResults(
    subsessionId: number,
    simsessionNumber: number
): RaceResults | null {
    return ldataReadFile<RaceResults>(MNT_PT, DATASET_RACE_RESULTS, [
        subsessionId,
        simsessionNumber,
    ]);
}

export function getRaceResultsAsync(
    subsessionId: number,
    simsessionNumber: number
): Promise<RaceResults | null> {
    return ldataReadFileAsync<RaceResults>(MNT_PT, DATASET_RACE_RESULTS, [
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveRaceResults(
    subsessionId: number,
    simsessionNumber: number,
    data: RaceResults
): void {
    ldataWriteFile(data, MNT_PT, DATASET_RACE_RESULTS, [
        subsessionId,
        simsessionNumber,
    ]);
}

export function getRaceAdjudications(
    subsessionId: number,
    simsessionNumber: number
): RaceAdjudications | null {
    return ldataReadFile<RaceAdjudications>(
        MNT_PT,
        DATASET_RACE_ADJUDICATIONS,
        [subsessionId, simsessionNumber]
    );
}

export function getRaceAdjudicationsAsync(
    subsessionId: number,
    simsessionNumber: number
): Promise<RaceAdjudications | null> {
    return ldataReadFileAsync<RaceAdjudications>(
        MNT_PT,
        DATASET_RACE_ADJUDICATIONS,
        [subsessionId, simsessionNumber]
    );
}

export function saveRaceAdjudications(
    subsessionId: number,
    simsessionNumber: number,
    data: RaceAdjudications
): void {
    ldataWriteFile(data, MNT_PT, DATASET_RACE_ADJUDICATIONS, [
        subsessionId,
        simsessionNumber,
    ]);
}

/**
 * Every league present in the dataset, ascending. Read off the directory
 * names rather than from a manifest, so whatever the producer has written is
 * what callers see.
 */
export function listLeagueIds(): number[] {
    return listNumericEntries(`${MNT_PT}${DATASET_SEASON_INFO}`);
}

/**
 * Every season present for a league, ascending. Empty when the league has
 * not been scraped.
 */
export function listSeasonIds(leagueId: number): number[] {
    return listNumericEntries(
        `${MNT_PT}${DATASET_SEASON_INFO}/${leagueId}`,
        '.json'
    );
}

function listNumericEntries(dir: string, suffix = ''): number[] {
    if (!existsSync(dir)) {
        return [];
    }
    return readdirSync(dir)
        .filter((name) => (suffix === '' ? true : name.endsWith(suffix)))
        .map((name) =>
            Number.parseInt(
                suffix === '' ? name : name.slice(0, -suffix.length),
                10
            )
        )
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => a - b);
}

/**
 * Every sim session of a season that has been run and resolved, as
 * `[subsession_id, simsession_number]` pairs in calendar then session order.
 * This is the full set of keys `raceResults` and `raceAdjudications` can be
 * addressed by.
 *
 * Includes practice and qualifying — use `listRacedSessions` for races.
 */
export function listRaceSessions(season: SeasonInfo): SessionKey[] {
    return season.schedule.flatMap((event) =>
        event.subsession_id === null
            ? []
            : event.sessions.map(
                  (session): SessionKey => [
                      event.subsession_id as number,
                      session.simsession_number,
                  ]
              )
    );
}

/**
 * Every race a season has run and resolved, in calendar order — heats
 * included.
 *
 * This is almost always the one you want. A heat-racing season runs two races
 * per event, both scoring championship points, and filtering on the session
 * number would report half of them.
 */
export function listRacedSessions(season: SeasonInfo): SessionKey[] {
    return season.schedule.flatMap((event) =>
        event.subsession_id === null
            ? []
            : event.sessions
                  .filter((session) => session.is_race)
                  .map(
                      (session): SessionKey => [
                          event.subsession_id as number,
                          session.simsession_number,
                      ]
                  )
    );
}

/**
 * The iRacing customer IDs of a season's drivers.
 */
export function listSeasonCustIds(season: SeasonInfo): number[] {
    return Object.values(season.drivers).map((driver) => driver.cust_id);
}
