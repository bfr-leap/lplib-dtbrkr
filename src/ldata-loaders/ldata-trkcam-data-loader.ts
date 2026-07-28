/**
 *
 * Accessors for `ldata-trkcam` — replay screenshots captured under the
 * broadcast (TV) camera by the `dprdc-trkcam` producer.
 *
 * Unlike every other dataset in the lake, this one holds binary PNGs rather
 * than JSON, so it bypasses `fsutil` (which hardcodes a `.json` suffix, utf8
 * encoding and `JSON.parse`) and reads through `fs` directly.
 *
 * Two collections, both of them directories whose filenames carry all the
 * metadata:
 *
 *     winners/<subsessionID>_<finishFrame>_<winnerUserID>.png
 *     highlights/<category>/<subsessionID>_<frame>_<driverUserID>.png
 *
 * so listing a directory is enough to index it — there is no manifest file.
 * `winners/` is flat and holds one capture per race; `highlights/` adds
 * exactly one level of category directory and holds any number of captures
 * per race, including none.
 *
 * The two collections share a filename grammar but not a meaning for the
 * third field: under `winners/` it is the race winner, under `highlights/`
 * it is the driver the highlight features, who need not have won.
 *
 * This dataset is producer-written; there is no write path here.
 *
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { readdir, readFile, stat } from 'fs/promises';

// TODO(upstream): move this interface to `ir-endpoint-types`. Mirrors the
// filename convention documented in the `ldata-trkcam` README and pinned by
// the contract schema at `contracts/schemas/ldata-trkcam.schema.json`.
export interface WinnerCapture {
    subsession_id: number;
    finish_frame: number;
    winner_user_id: number;
    // Basename only, e.g. `87426864_418074_555362.png`.
    file: string;
}

// TODO(upstream): move this interface to `ir-endpoint-types`. Mirrors the
// `highlights/` layout documented in the `ldata-trkcam` README and pinned by
// the contract schema at `contracts/schemas/ldata-trkcam.schema.json`.
export interface HighlightCapture {
    subsession_id: number;
    // The replay frame the still was taken at — the moment that reads best
    // for the category, not necessarily where the event was first detected.
    frame: number;
    // The driver the highlight features (the overtaking car, the driver in
    // the incident). Unlike `WinnerCapture.winner_user_id`, this driver did
    // not necessarily win the race.
    driver_user_id: number;
    category: HighlightCategory;
    // Basename only, e.g. `87426864_199243_879688.png`. Not unique across
    // the dataset on its own — the same moment can be filed under a
    // different category — so it only addresses a file alongside `category`.
    file: string;
}

// The category directories under `highlights/`. This is a closed set pinned
// by the contract schema, and it doubles as the allow-list that keeps a
// caller-supplied category from walking out of the dataset directory.
export const HIGHLIGHT_CATEGORIES = [
    'battles',
    'crashes',
    'overtakes',
    'starts',
] as const;

export type HighlightCategory = typeof HIGHLIGHT_CATEGORIES[number];

const MNT_PT = './public/data/ldata-trkcam/';
const DATASET_WINNERS = 'winners';
const DATASET_HIGHLIGHTS = 'highlights';
const WINNERS_DIR = `${MNT_PT}${DATASET_WINNERS}`;
const HIGHLIGHTS_DIR = `${MNT_PT}${DATASET_HIGHLIGHTS}`;

// `<subsessionID>_<finishFrame>_<winnerUserID>.png`. All three keys are
// unsigned, so the `n<abs>` negative-key encoding used elsewhere in the lake
// does not apply here.
const FILE_RE = /^(\d+)_(\d+)_(\d+)\.png$/;

/**
 * Every winner capture in the dataset, indexed straight off the filenames.
 * Returns an empty array if the dataset isn't mounted yet.
 */
export function listWinnerCaptures(): WinnerCapture[] {
    if (!existsSync(WINNERS_DIR)) {
        return [];
    }
    return parseEntries(readdirSync(WINNERS_DIR, { withFileTypes: true }));
}

export async function listWinnerCapturesAsync(): Promise<WinnerCapture[]> {
    if (!(await pathExistsAsync(WINNERS_DIR))) {
        return [];
    }
    return parseEntries(await readdir(WINNERS_DIR, { withFileTypes: true }));
}

/**
 * The winning capture for a subsession. A subsession can hold more than one
 * race session (e.g. a heat plus a feature), so the capture with the highest
 * finish frame — the last line crossing of the subsession — wins.
 */
export function getWinnerCaptureForSubsession(
    subsessionId: number
): WinnerCapture | null {
    return pickForSubsession(listWinnerCaptures(), subsessionId);
}

export async function getWinnerCaptureForSubsessionAsync(
    subsessionId: number
): Promise<WinnerCapture | null> {
    return pickForSubsession(await listWinnerCapturesAsync(), subsessionId);
}

/**
 * The most recent capture of a driver winning a race. iRacing subsession IDs
 * increase over time, so the highest one is the latest race; ties (a driver
 * winning twice inside one subsession) fall back to the highest finish frame.
 */
export function getLatestWinnerCaptureForDriver(
    userId: number
): WinnerCapture | null {
    return pickLatestForDriver(listWinnerCaptures(), userId);
}

export async function getLatestWinnerCaptureForDriverAsync(
    userId: number
): Promise<WinnerCapture | null> {
    return pickLatestForDriver(await listWinnerCapturesAsync(), userId);
}

/**
 * Raw PNG bytes for a capture, addressed by basename. Returns null if the
 * name isn't a well-formed capture filename or the file can't be read.
 */
export function readWinnerCaptureBytes(file: string): Buffer | null {
    if (!FILE_RE.test(file)) {
        return null;
    }
    try {
        return readFileSync(`${WINNERS_DIR}/${file}`);
    } catch (e) {
        return null;
    }
}

export async function readWinnerCaptureBytesAsync(
    file: string
): Promise<Buffer | null> {
    if (!FILE_RE.test(file)) {
        return null;
    }
    try {
        return await readFile(`${WINNERS_DIR}/${file}`);
    } catch (e) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

/**
 * Narrows an arbitrary string to a known category. Callers taking a category
 * off the wire should route it through here (or through the accessors below,
 * which all reject an unknown category) rather than casting.
 */
export function isHighlightCategory(value: string): value is HighlightCategory {
    return (HIGHLIGHT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Every highlight in the dataset, or every highlight in one category.
 *
 * Ordered by category — in `HIGHLIGHT_CATEGORIES` order — then by ascending
 * frame, so captures from a subsession come back in replay order. Directory
 * listings are not ordered, so without this the output would vary by
 * filesystem.
 *
 * Returns an empty array if the dataset isn't mounted yet, and for an
 * unrecognised category.
 */
export function listHighlightCaptures(
    category?: HighlightCategory
): HighlightCapture[] {
    return categoriesToScan(category).flatMap((cat) => {
        const dir = highlightDir(cat);
        if (!existsSync(dir)) {
            return [];
        }
        return parseHighlightEntries(
            readdirSync(dir, { withFileTypes: true }),
            cat
        );
    });
}

export async function listHighlightCapturesAsync(
    category?: HighlightCategory
): Promise<HighlightCapture[]> {
    const perCategory = await Promise.all(
        categoriesToScan(category).map(async (cat) => {
            const dir = highlightDir(cat);
            if (!(await pathExistsAsync(dir))) {
                return [];
            }
            return parseHighlightEntries(
                await readdir(dir, { withFileTypes: true }),
                cat
            );
        })
    );
    return perCategory.flat();
}

/**
 * Every highlight from a subsession, optionally narrowed to one category.
 * A race can produce any number of highlights, so an empty array is a normal
 * result and not an error.
 */
export function getHighlightCapturesForSubsession(
    subsessionId: number,
    category?: HighlightCategory
): HighlightCapture[] {
    return listHighlightCaptures(category).filter(
        (c) => c.subsession_id === subsessionId
    );
}

export async function getHighlightCapturesForSubsessionAsync(
    subsessionId: number,
    category?: HighlightCategory
): Promise<HighlightCapture[]> {
    return (await listHighlightCapturesAsync(category)).filter(
        (c) => c.subsession_id === subsessionId
    );
}

/**
 * Every highlight featuring a driver, optionally narrowed to one category.
 * Ordered newest subsession first — iRacing subsession IDs increase over
 * time — so a driver's most recent moments lead. Within a subsession the
 * replay order of `listHighlightCaptures` is preserved.
 */
export function getHighlightCapturesForDriver(
    userId: number,
    category?: HighlightCategory
): HighlightCapture[] {
    return byNewestSubsession(
        listHighlightCaptures(category).filter(
            (c) => c.driver_user_id === userId
        )
    );
}

export async function getHighlightCapturesForDriverAsync(
    userId: number,
    category?: HighlightCategory
): Promise<HighlightCapture[]> {
    return byNewestSubsession(
        (await listHighlightCapturesAsync(category)).filter(
            (c) => c.driver_user_id === userId
        )
    );
}

/**
 * Raw PNG bytes for a highlight, addressed by category and basename. Returns
 * null if the category is unknown, the name isn't a well-formed capture
 * filename, or the file can't be read.
 *
 * Both arguments are checked against fixed grammars before they reach the
 * filesystem, so a caller cannot use either to escape the dataset directory.
 */
export function readHighlightCaptureBytes(
    category: string,
    file: string
): Buffer | null {
    if (!isHighlightCategory(category) || !FILE_RE.test(file)) {
        return null;
    }
    try {
        return readFileSync(`${highlightDir(category)}/${file}`);
    } catch (e) {
        return null;
    }
}

export async function readHighlightCaptureBytesAsync(
    category: string,
    file: string
): Promise<Buffer | null> {
    if (!isHighlightCategory(category) || !FILE_RE.test(file)) {
        return null;
    }
    try {
        return await readFile(`${highlightDir(category)}/${file}`);
    } catch (e) {
        return null;
    }
}

interface DirentLike {
    name: string;
    isFile: () => boolean;
}

function parseEntries(entries: DirentLike[]): WinnerCapture[] {
    const captures: WinnerCapture[] = [];
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const match = FILE_RE.exec(entry.name);
        if (match === null) continue;
        captures.push({
            subsession_id: parseInt(match[1], 10),
            finish_frame: parseInt(match[2], 10),
            winner_user_id: parseInt(match[3], 10),
            file: entry.name,
        });
    }
    return captures;
}

function highlightDir(category: HighlightCategory): string {
    return `${HIGHLIGHTS_DIR}/${category}`;
}

// An explicit category is honoured only if it is a known one; an unknown
// category scans nothing rather than reaching for a directory that should
// not exist. Omitting it scans every category.
function categoriesToScan(
    category?: HighlightCategory
): readonly HighlightCategory[] {
    if (category === undefined) {
        return HIGHLIGHT_CATEGORIES;
    }
    return isHighlightCategory(category) ? [category] : [];
}

function parseHighlightEntries(
    entries: DirentLike[],
    category: HighlightCategory
): HighlightCapture[] {
    const captures: HighlightCapture[] = [];
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const match = FILE_RE.exec(entry.name);
        if (match === null) continue;
        captures.push({
            subsession_id: parseInt(match[1], 10),
            frame: parseInt(match[2], 10),
            driver_user_id: parseInt(match[3], 10),
            category,
            file: entry.name,
        });
    }
    // Replay order within the category. `sort` is stable, so captures that
    // somehow share a frame keep their listing order.
    return captures.sort((a, b) => a.frame - b.frame);
}

// Stable, so the replay ordering established per category survives.
function byNewestSubsession(captures: HighlightCapture[]): HighlightCapture[] {
    return captures.sort((a, b) => b.subsession_id - a.subsession_id);
}

function pickForSubsession(
    captures: WinnerCapture[],
    subsessionId: number
): WinnerCapture | null {
    let best: WinnerCapture | null = null;
    for (const capture of captures) {
        if (capture.subsession_id !== subsessionId) continue;
        if (best === null || capture.finish_frame > best.finish_frame) {
            best = capture;
        }
    }
    return best;
}

function pickLatestForDriver(
    captures: WinnerCapture[],
    userId: number
): WinnerCapture | null {
    let best: WinnerCapture | null = null;
    for (const capture of captures) {
        if (capture.winner_user_id !== userId) continue;
        if (best === null || isNewer(capture, best)) {
            best = capture;
        }
    }
    return best;
}

function isNewer(candidate: WinnerCapture, incumbent: WinnerCapture): boolean {
    if (candidate.subsession_id !== incumbent.subsession_id) {
        return candidate.subsession_id > incumbent.subsession_id;
    }
    return candidate.finish_frame > incumbent.finish_frame;
}

async function pathExistsAsync(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}
