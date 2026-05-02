/**
 *
 * This TypeScript module imports the readFileSync function from the 'fs' (file system) module and the
 * SimsessionResults type from an external module 'ir-endpoint-types'. It defines a function
 * getSimSessionResults that takes a subsessionId and a simsessionNumber as parameters. This function
 * reads and parses a JSON file named based on the provided ids, located in the './public/data/derived/'
 * directory, and returns the parsed SimsessionResults object.
 *
 */

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

export function saveTrackInfoDirectory(
    leagueId: number,
    data: TrackInfoDirectory
): void {
    ldataWriteFile(data, MNT_PT, 'trackInfoDirectory', [leagueId]);
}

export function saveTrackInfoDirectoryAsync(
    leagueId: number,
    data: TrackInfoDirectory
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'trackInfoDirectory', [leagueId]);
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

export function saveTrackResults(
    leagueId: number,
    carId: number,
    trackId: number,
    data: TrackStats
): void {
    ldataWriteFile(data, MNT_PT, 'trackResults', [leagueId, carId, trackId]);
}

export function saveTrackResultsAsync(
    leagueId: number,
    carId: number,
    trackId: number,
    data: TrackStats
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'trackResults', [
        leagueId,
        carId,
        trackId,
    ]);
}

// `driverSessionResults` is keyed by (leagueId, sessionType, custId) where
// `sessionType` is a string segment (`race`, `sprint`, `quali`). The fsutil
// helpers accept mixed numeric/string keys, so this slots into the same
// path-builder + Kafka notify pipeline as the all-numeric datasets.
export function getDriverSessionResults(
    leagueId: number,
    sessionType: string,
    custId: number
): DriverResults | null {
    return ldataReadFile<DriverResults>(MNT_PT, 'driverSessionResults', [
        leagueId,
        sessionType,
        custId,
    ]);
}

export function getDriverSessionResultsAsync(
    leagueId: number,
    sessionType: string,
    custId: number
): Promise<DriverResults | null> {
    return ldataReadFileAsync<DriverResults>(MNT_PT, 'driverSessionResults', [
        leagueId,
        sessionType,
        custId,
    ]);
}

export function saveDriverSessionResults(
    leagueId: number,
    sessionType: string,
    custId: number,
    data: DriverResults
): void {
    ldataWriteFile(data, MNT_PT, 'driverSessionResults', [
        leagueId,
        sessionType,
        custId,
    ]);
}

export function saveDriverSessionResultsAsync(
    leagueId: number,
    sessionType: string,
    custId: number,
    data: DriverResults
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'driverSessionResults', [
        leagueId,
        sessionType,
        custId,
    ]);
}

export function saveSimSessionResults(
    subsessionId: number,
    simsessionNumber: number,
    data: SimsessionResults
): void {
    ldataWriteFile(data, MNT_PT, 'simSessionResults', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveSimSessionResultsAsync(
    subsessionId: number,
    simsessionNumber: number,
    data: SimsessionResults
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'simSessionResults', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveLeagueSubsessionIndex(
    leagueId: number,
    data: SeasonSimsessionIndex[]
): void {
    ldataWriteFile(data, MNT_PT, 'leagueSimsessionIndex', [leagueId]);
}

export function saveLeagueSubsessionIndexAsync(
    leagueId: number,
    data: SeasonSimsessionIndex[]
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'leagueSimsessionIndex', [
        leagueId,
    ]);
}

export function saveSimsessionDriverTelemetry(
    subsession: number,
    simsession: number,
    driver: number,
    data: ST_DriverTelemetry
): void {
    ldataWriteFile(data, MNT_PT, 'simsessionDriverTelemetry', [
        subsession,
        simsession,
        driver,
    ]);
}

export function saveSimsessionDriverTelemetryAsync(
    subsession: number,
    simsession: number,
    driver: number,
    data: ST_DriverTelemetry
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'simsessionDriverTelemetry', [
        subsession,
        simsession,
        driver,
    ]);
}

export function saveLeagueDriverStats(
    leagueId: number,
    data: DriverStatsMap
): void {
    ldataWriteFile(data, MNT_PT, 'leagueDriverStats', [leagueId]);
}

export function saveLeagueDriverStatsAsync(
    leagueId: number,
    data: DriverStatsMap
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'leagueDriverStats', [leagueId]);
}

export function saveSingleMemberData(custId: number, data: M_Member): void {
    ldataWriteFile(data, MNT_PT, 'singleMemberData', [custId]);
}

export function saveSingleMemberDataAsync(
    custId: number,
    data: M_Member
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'singleMemberData', [custId]);
}
