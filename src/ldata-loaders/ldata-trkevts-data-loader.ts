import {
    ldataWriteFile,
    ldataWriteFileAsync,
    ldataReadFile,
    ldataReadFileAsync,
} from './fsutil';
import type { OnTrackRaceEvents } from 'ir-endpoint-types';

const MNT_PT = './public/data/ldata-trkevts/';

export function getRawPositionChanges(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): OnTrackRaceEvents | null {
    return ldataReadFile<OnTrackRaceEvents>(MNT_PT, 'rawPositionChanges', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getRawPositionChangesAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): Promise<OnTrackRaceEvents | null> {
    return ldataReadFileAsync<OnTrackRaceEvents>(MNT_PT, 'rawPositionChanges', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getOnTrackOvertakes(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): OnTrackRaceEvents | null {
    return ldataReadFile<OnTrackRaceEvents>(MNT_PT, 'onTrackOvertakes', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getOnTrackOvertakesAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): Promise<OnTrackRaceEvents | null> {
    return ldataReadFileAsync<OnTrackRaceEvents>(MNT_PT, 'onTrackOvertakes', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getOnTrackPitStops(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): OnTrackRaceEvents | null {
    return ldataReadFile<OnTrackRaceEvents>(MNT_PT, 'onTrackPitStops', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getOnTrackPitStopsAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): Promise<OnTrackRaceEvents | null> {
    return ldataReadFileAsync<OnTrackRaceEvents>(MNT_PT, 'onTrackPitStops', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getOnTrackIncidents(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): OnTrackRaceEvents | null {
    return ldataReadFile<OnTrackRaceEvents>(MNT_PT, 'onTrackIncidents', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getOnTrackIncidentsAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): Promise<OnTrackRaceEvents | null> {
    return ldataReadFileAsync<OnTrackRaceEvents>(MNT_PT, 'onTrackIncidents', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getOnTrackFinishingNotes(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): OnTrackRaceEvents | null {
    return ldataReadFile<OnTrackRaceEvents>(MNT_PT, 'onTrackFinishingNotes', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getOnTrackFinishingNotesAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): Promise<OnTrackRaceEvents | null> {
    return ldataReadFileAsync<OnTrackRaceEvents>(
        MNT_PT,
        'onTrackFinishingNotes',
        [leagueId, subsessionId, simsessionNumber]
    );
}

export function saveRawPositionChanges(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): void {
    ldataWriteFile(dataset, MNT_PT, 'rawPositionChanges', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveRawPositionChangesAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'rawPositionChanges', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveOnTrackOvertakes(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): void {
    ldataWriteFile(dataset, MNT_PT, 'onTrackOvertakes', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveOnTrackOvertakesAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'onTrackOvertakes', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveOnTrackPitStops(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): void {
    ldataWriteFile(dataset, MNT_PT, 'onTrackPitStops', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveOnTrackPitStopsAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'onTrackPitStops', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveOnTrackIncidents(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): void {
    ldataWriteFile(dataset, MNT_PT, 'onTrackIncidents', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveOnTrackIncidentsAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'onTrackIncidents', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveOnTrackFinishingNotes(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): void {
    ldataWriteFile(dataset, MNT_PT, 'onTrackFinishingNotes', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveOnTrackFinishingNotesAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: OnTrackRaceEvents
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'onTrackFinishingNotes', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}
