/**
 *
 * Accessors for `ldata-trkcam` — finish-line screenshots of each race winner,
 * captured from iRacing replays by the `dprdc-trkcam` producer.
 *
 * Unlike every other dataset in the lake, this one holds binary PNGs rather
 * than JSON, so it bypasses `fsutil` (which hardcodes a `.json` suffix, utf8
 * encoding and `JSON.parse`) and reads through `fs` directly.
 *
 * The dataset is a flat directory whose filenames carry all the metadata:
 *
 *     winners/<subsessionID>_<finishFrame>_<winnerUserID>.png
 *
 * so listing the directory is enough to index it — there is no manifest file.
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

const MNT_PT = './public/data/ldata-trkcam/';
const DATASET_WINNERS = 'winners';
const WINNERS_DIR = `${MNT_PT}${DATASET_WINNERS}`;

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
