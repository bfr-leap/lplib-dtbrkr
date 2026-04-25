/**
 *
 * This TypeScript module imports the readFileSync function from the 'fs' (file system) module and the
 * SimsessionResults type from an external module 'ir-endpoints-types'. It defines a function
 * getSimSessionResults that takes a subsessionId and a simsessionNumber as parameters. This function
 * reads and parses a JSON file named based on the provided ids, located in the './public/data/derived/'
 * directory, and returns the parsed SimsessionResults object.
 *
 */

import type {
    SimsessionResults,
    SeasonSimsessionIndex,
    ST_DriverTelemetry,
} from 'ir-endpoints-types';
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

export function getLeaguSubsessionIndex(
    leagueId: number
): SeasonSimsessionIndex[] | null {
    return ldataReadFile<SeasonSimsessionIndex[]>(
        MNT_PT,
        'leagueSimsessionIndex',
        [leagueId]
    );
}

export function getLeaguSubsessionIndexAsync(
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
