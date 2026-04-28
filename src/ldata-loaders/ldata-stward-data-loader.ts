import { existsSync, readdirSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import {
    ldataReadFile,
    ldataReadFileAsync,
    ldataWriteFile,
    ldataWriteFileAsync,
} from './fsutil';
import type { StewardRuling } from 'ir-endpoint-types';

const MNT_PT = './public/data/ldata-stward/';
const DATASET_STEWARD_RULINGS = 'stewardRulings';

/**
 * Read the steward rulings for a single (leagueId, seasonId) pair.
 * Returns an empty array if no rulings file exists.
 */
export function getStewardRulings(
    leagueId: number,
    seasonId: number
): StewardRuling[] {
    return (
        ldataReadFile<StewardRuling[]>(MNT_PT, DATASET_STEWARD_RULINGS, [
            leagueId,
            seasonId,
        ]) ?? []
    );
}

export async function getStewardRulingsAsync(
    leagueId: number,
    seasonId: number
): Promise<StewardRuling[]> {
    return (
        (await ldataReadFileAsync<StewardRuling[]>(
            MNT_PT,
            DATASET_STEWARD_RULINGS,
            [leagueId, seasonId]
        )) ?? []
    );
}

/**
 * Write the steward rulings for a single (leagueId, seasonId) pair. The
 * provided array replaces any existing rulings file for that season.
 */
export function saveStewardRulings(
    leagueId: number,
    seasonId: number,
    rulings: StewardRuling[]
): void {
    ldataWriteFile(rulings, MNT_PT, DATASET_STEWARD_RULINGS, [
        leagueId,
        seasonId,
    ]);
}

export function saveStewardRulingsAsync(
    leagueId: number,
    seasonId: number,
    rulings: StewardRuling[]
): Promise<void> {
    return ldataWriteFileAsync(rulings, MNT_PT, DATASET_STEWARD_RULINGS, [
        leagueId,
        seasonId,
    ]);
}

/**
 * Walks the stewardRulings dataset directory and returns every ruling across
 * all leagues and seasons.
 */
export function getAllStewardRulings(): StewardRuling[] {
    const root = `${MNT_PT}${DATASET_STEWARD_RULINGS}`;
    if (!existsSync(root)) {
        return [];
    }

    const rulings: StewardRuling[] = [];
    const leagueDirs = readdirSync(root, { withFileTypes: true });
    for (const leagueEntry of leagueDirs) {
        if (!leagueEntry.isDirectory()) continue;
        const leagueId = parseLeagueSegment(leagueEntry.name);
        if (leagueId === null) continue;
        rulings.push(...readAllRulingsForLeague(leagueId));
    }
    return rulings;
}

export async function getAllStewardRulingsAsync(): Promise<StewardRuling[]> {
    const root = `${MNT_PT}${DATASET_STEWARD_RULINGS}`;
    if (!(await pathExistsAsync(root))) {
        return [];
    }

    const rulings: StewardRuling[] = [];
    const leagueDirs = await readdir(root, { withFileTypes: true });
    for (const leagueEntry of leagueDirs) {
        if (!leagueEntry.isDirectory()) continue;
        const leagueId = parseLeagueSegment(leagueEntry.name);
        if (leagueId === null) continue;
        rulings.push(...(await readAllRulingsForLeagueAsync(leagueId)));
    }
    return rulings;
}

/**
 * Returns every steward ruling for the given league, across all seasons.
 */
export function getStewardRulingsByLeague(leagueId: number): StewardRuling[] {
    return readAllRulingsForLeague(leagueId);
}

export function getStewardRulingsByLeagueAsync(
    leagueId: number
): Promise<StewardRuling[]> {
    return readAllRulingsForLeagueAsync(leagueId);
}

/**
 * Returns every steward ruling from the given season (season_id is globally
 * unique across iRacing, so this walks all leagues and filters).
 */
export function getStewardRulingsBySeason(seasonId: number): StewardRuling[] {
    const needle = String(seasonId);
    return getAllStewardRulings().filter((r) => String(r.season_id) === needle);
}

export async function getStewardRulingsBySeasonAsync(
    seasonId: number
): Promise<StewardRuling[]> {
    const needle = String(seasonId);
    const all = await getAllStewardRulingsAsync();
    return all.filter((r) => String(r.season_id) === needle);
}

/**
 * Returns every steward ruling that sanctioned the given driver, matched on
 * either the iRacing driver_id or the discord_user_id.
 */
export function getStewardRulingsByDriver(
    driverId: number | string
): StewardRuling[] {
    const needle = String(driverId);
    return getAllStewardRulings().filter(
        (r) =>
            String(r.driver_id) === needle ||
            (r.discord_user_id !== undefined &&
                String(r.discord_user_id) === needle)
    );
}

export async function getStewardRulingsByDriverAsync(
    driverId: number | string
): Promise<StewardRuling[]> {
    const needle = String(driverId);
    const all = await getAllStewardRulingsAsync();
    return all.filter(
        (r) =>
            String(r.driver_id) === needle ||
            (r.discord_user_id !== undefined &&
                String(r.discord_user_id) === needle)
    );
}

function readAllRulingsForLeague(leagueId: number): StewardRuling[] {
    const leagueKey = leagueId < 0 ? `n${-leagueId}` : `${leagueId}`;
    const leagueDir = `${MNT_PT}${DATASET_STEWARD_RULINGS}/${leagueKey}`;
    if (!existsSync(leagueDir)) {
        return [];
    }

    const rulings: StewardRuling[] = [];
    const seasonFiles = readdirSync(leagueDir, { withFileTypes: true });
    for (const seasonEntry of seasonFiles) {
        if (!seasonEntry.isFile()) continue;
        if (!seasonEntry.name.endsWith('.json')) continue;
        const seasonId = parseSeasonSegment(
            seasonEntry.name.slice(0, -'.json'.length)
        );
        if (seasonId === null) continue;
        rulings.push(...getStewardRulings(leagueId, seasonId));
    }
    return rulings;
}

async function readAllRulingsForLeagueAsync(
    leagueId: number
): Promise<StewardRuling[]> {
    const leagueKey = leagueId < 0 ? `n${-leagueId}` : `${leagueId}`;
    const leagueDir = `${MNT_PT}${DATASET_STEWARD_RULINGS}/${leagueKey}`;
    if (!(await pathExistsAsync(leagueDir))) {
        return [];
    }

    const rulings: StewardRuling[] = [];
    const seasonFiles = await readdir(leagueDir, { withFileTypes: true });
    for (const seasonEntry of seasonFiles) {
        if (!seasonEntry.isFile()) continue;
        if (!seasonEntry.name.endsWith('.json')) continue;
        const seasonId = parseSeasonSegment(
            seasonEntry.name.slice(0, -'.json'.length)
        );
        if (seasonId === null) continue;
        rulings.push(...(await getStewardRulingsAsync(leagueId, seasonId)));
    }
    return rulings;
}

async function pathExistsAsync(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

function parseLeagueSegment(segment: string): number | null {
    return parseKeySegment(segment);
}

function parseSeasonSegment(segment: string): number | null {
    return parseKeySegment(segment);
}

function parseKeySegment(segment: string): number | null {
    // fsutil encodes negative numeric keys as `n<abs>`; decode both forms.
    const isNegative = segment.startsWith('n');
    const digits = isNegative ? segment.slice(1) : segment;
    if (digits.length === 0 || !/^\d+$/.test(digits)) {
        return null;
    }
    const value = parseInt(digits, 10);
    return isNegative ? -value : value;
}
