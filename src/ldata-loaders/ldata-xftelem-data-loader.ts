import { EpochTelemetry } from 'ir-endpoint-types';
import {
    ldataReadFile,
    ldataReadFileAsync,
    ldataWriteFile,
    ldataWriteFileAsync,
} from './fsutil';

const MNT_PT = './public/data/ldata-xftelem/';
const DATASET_RECONSTRUCTED_TELEMETRY = 'reconstructedTelemetry';

export function getReconstructedTelemetry(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): EpochTelemetry | null {
    return ldataReadFile<EpochTelemetry>(
        MNT_PT,
        DATASET_RECONSTRUCTED_TELEMETRY,
        [leagueId, subsessionId, simsessionNumber]
    );
}

export function getReconstructedTelemetryAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): Promise<EpochTelemetry | null> {
    return ldataReadFileAsync<EpochTelemetry>(
        MNT_PT,
        DATASET_RECONSTRUCTED_TELEMETRY,
        [leagueId, subsessionId, simsessionNumber]
    );
}

export function writeReconstructedTelemetry(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    telemetry: EpochTelemetry
): void {
    ldataWriteFile(telemetry, MNT_PT, DATASET_RECONSTRUCTED_TELEMETRY, [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function writeReconstructedTelemetryAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    telemetry: EpochTelemetry
): Promise<void> {
    return ldataWriteFileAsync(
        telemetry,
        MNT_PT,
        DATASET_RECONSTRUCTED_TELEMETRY,
        [leagueId, subsessionId, simsessionNumber]
    );
}
