/**
 *
 * This TypeScript module imports the readFileSync function from the 'fs' (file system) module and the
 * SimsessionResults type from an external module 'ir-endpoint-types'. It defines a function
 * getSimSessionResults that takes a subsessionId and a simsessionNumber as parameters. This function
 * reads and parses a JSON file named based on the provided ids, located in the './public/data/derived/'
 * directory, and returns the parsed SimsessionResults object.
 *
 */

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';

import type {
    DriverResults,
    SimsessionResults,
    SeasonSimsessionIndex,
    ST_DriverTelemetry,
    DriverStatsMap,
    M_Member,
    TrackInfoDirectory,
    TrackStats,
} from 'ir-endpoint-types';
import {
    ldataReadFile,
    ldataReadFileAsync,
    ldataWriteFile,
    ldataWriteFileAsync,
} from './fsutil';

const MNT_PT = './public/data/ldata-rsltsts/';

export function getSimSessionResults(
    subsessionId: number,
    simsessionNumber: number
): SimsessionResults | null {
    return ldataReadFile<SimsessionResults>(MNT_PT, 'simSessionResults', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function getSimSessionResultsAsync(
    subsessionId: number,
    simsessionNumber: number
): Promise<SimsessionResults | null> {
    return ldataReadFileAsync<SimsessionResults>(MNT_PT, 'simSessionResults', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function getLeagueSubsessionIndex(
    leagueId: number
): SeasonSimsessionIndex[] | null {
    return ldataReadFile<SeasonSimsessionIndex[]>(
        MNT_PT,
        'leagueSimsessionIndex',
        [leagueId]
    );
}

export function getLeagueSubsessionIndexAsync(
    leagueId: number
): Promise<SeasonSimsessionIndex[] | null> {
    return ldataReadFileAsync<SeasonSimsessionIndex[]>(
        MNT_PT,
        'leagueSimsessionIndex',
        [leagueId]
    );
}

export function getSimsessionDriverTelemetry(
    subssesion: number,
    simsession: number,
    driver: number
): ST_DriverTelemetry | null {
    return ldataReadFile<ST_DriverTelemetry>(
        MNT_PT,
        'simsessionDriverTelemetry',
        [subssesion, simsession, driver]
    );
}

export function getSimsessionDriverTelemetryAsync(
    subssesion: number,
    simsession: number,
    driver: number
): Promise<ST_DriverTelemetry | null> {
    return ldataReadFileAsync<ST_DriverTelemetry>(
        MNT_PT,
        'simsessionDriverTelemetry',
        [subssesion, simsession, driver]
    );
}

const DATASET_PROCESSED_TELEMETRY = 'processedTelemetryManifest';

export function getProcessedTelemetryManifest(leagueId: number): Set<number> {
    const data = ldataReadFile<number[]>(MNT_PT, DATASET_PROCESSED_TELEMETRY, [
        leagueId,
    ]);
    if (data === null) {
        return new Set();
    }
    return new Set<number>(data);
}

export async function getProcessedTelemetryManifestAsync(
    leagueId: number
): Promise<Set<number>> {
    const data = await ldataReadFileAsync<number[]>(
        MNT_PT,
        DATASET_PROCESSED_TELEMETRY,
        [leagueId]
    );
    if (data === null) {
        return new Set();
    }
    return new Set<number>(data);
}

export function saveProcessedTelemetryManifest(
    leagueId: number,
    subsessionIds: Set<number>
): void {
    ldataWriteFile(
        Array.from(subsessionIds),
        MNT_PT,
        DATASET_PROCESSED_TELEMETRY,
        [leagueId]
    );
}

export async function saveProcessedTelemetryManifestAsync(
    leagueId: number,
    subsessionIds: Set<number>
): Promise<void> {
    await ldataWriteFileAsync(
        Array.from(subsessionIds),
        MNT_PT,
        DATASET_PROCESSED_TELEMETRY,
        [leagueId]
    );
}

export function getLeagueDriverStats(
    leagueId: number
): DriverStatsMap | null {
    return ldataReadFile<DriverStatsMap>(MNT_PT, 'leagueDriverStats', [
        leagueId,
    ]);
}

export function getLeagueDriverStatsAsync(
    leagueId: number
): Promise<DriverStatsMap | null> {
    return ldataReadFileAsync<DriverStatsMap>(MNT_PT, 'leagueDriverStats', [
        leagueId,
    ]);
}

export function getSingleMemberData(custId: number): M_Member | null {
    return ldataReadFile<M_Member>(MNT_PT, 'singleMemberData', [custId]);
}

export function getSingleMemberDataAsync(
    custId: number
): Promise<M_Member | null> {
    return ldataReadFileAsync<M_Member>(MNT_PT, 'singleMemberData', [custId]);
}

export function getTrackInfoDirectory(
    leagueId: number
): TrackInfoDirectory | null {
    return ldataReadFile<TrackInfoDirectory>(MNT_PT, 'trackInfoDirectory', [
        leagueId,
    ]);
}

export function getTrackInfoDirectoryAsync(
    leagueId: number
): Promise<TrackInfoDirectory | null> {
    return ldataReadFileAsync<TrackInfoDirectory>(
        MNT_PT,
        'trackInfoDirectory',
        [leagueId]
    );
}

export function getTrackResults(
    leagueId: number,
    carId: number,
    trackId: number
): TrackStats | null {
    return ldataReadFile<TrackStats>(MNT_PT, 'trackResults', [
        leagueId,
        carId,
        trackId,
    ]);
}

export function getTrackResultsAsync(
    leagueId: number,
    carId: number,
    trackId: number
): Promise<TrackStats | null> {
    return ldataReadFileAsync<TrackStats>(MNT_PT, 'trackResults', [
        leagueId,
        carId,
        trackId,
    ]);
}

// `driverSessionResults` has a string session-type key (`race`, `sprint`,
// `quali`) between two numeric keys, so the numeric `ldataReadFile` path
// builder can't represent it. Read directly and honor the dispatcher's
// null-on-failure contract.
export function getDriverSessionResults(
    leagueId: number,
    sessionType: string,
    custId: number
): DriverResults | null {
    try {
        return JSON.parse(
            readFileSync(
                `${MNT_PT}driverSessionResults/${leagueId}/${sessionType}/${custId}.json`,
                { encoding: 'utf8', flag: 'r' }
            )
        ) as DriverResults;
    } catch {
        return null;
    }
}

export async function getDriverSessionResultsAsync(
    leagueId: number,
    sessionType: string,
    custId: number
): Promise<DriverResults | null> {
    try {
        return JSON.parse(
            await readFile(
                `${MNT_PT}driverSessionResults/${leagueId}/${sessionType}/${custId}.json`,
                { encoding: 'utf8', flag: 'r' }
            )
        ) as DriverResults;
    } catch {
        return null;
    }
}
