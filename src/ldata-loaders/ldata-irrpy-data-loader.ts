import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';

import type { SubsessionTelemetry } from 'ir-endpoint-types';
import {
    ldataReadFile,
    ldataReadFileAsync,
    ldataWriteFile,
    ldataWriteFileAsync,
} from './fsutil';

const MNT_PT = './public/data/ldata-irrpy/';
const DATASET_TELEMETRY_SUBSESSIONS = 'telemetrySubsessions';

export function getTelemetrySubsessions(leagueId: number): number[] | null {
    return ldataReadFile<number[]>(MNT_PT, DATASET_TELEMETRY_SUBSESSIONS, [
        leagueId,
    ]);
}

export function getTelemetrySubsessionsAsync(
    leagueId: number
): Promise<number[] | null> {
    return ldataReadFileAsync<number[]>(MNT_PT, DATASET_TELEMETRY_SUBSESSIONS, [
        leagueId,
    ]);
}

export function saveTelemetrySubsessions(
    leagueId: number,
    subsessions: number[]
): void {
    ldataWriteFile(subsessions, MNT_PT, DATASET_TELEMETRY_SUBSESSIONS, [
        leagueId,
    ]);
}

export function saveTelemetrySubsessionsAsync(
    leagueId: number,
    subsessions: number[]
): Promise<void> {
    return ldataWriteFileAsync(
        subsessions,
        MNT_PT,
        DATASET_TELEMETRY_SUBSESSIONS,
        [leagueId]
    );
}

export function getTelemetryScan(
    leagueId: number,
    subsessionId: number
): SubsessionTelemetry | null {
    try {
        let strTelemetry: string = '';
        let nans = [/-nan\(ind\)/g, /nan\(ind\)/g, /inf/g, /-inf/g, /--1/g];

        strTelemetry = readFileSync(
            `${MNT_PT}telemetryScans/${leagueId}/${subsessionId}.json`,
            {
                encoding: 'utf8',
                flag: 'r',
            }
        );

        for (let nan of nans) {
            strTelemetry = strTelemetry.replace(nan, '-1');
        }

        let ret: SubsessionTelemetry = <SubsessionTelemetry>(
            JSON.parse(strTelemetry)
        );

        return ret;
    } catch (e) {
        return null;
    }
}

export async function getTelemetryScanAsync(
    leagueId: number,
    subsessionId: number
): Promise<SubsessionTelemetry | null> {
    try {
        let strTelemetry: string = '';
        let nans = [/-nan\(ind\)/g, /nan\(ind\)/g, /inf/g, /-inf/g, /--1/g];

        strTelemetry = await readFile(
            `${MNT_PT}telemetryScans/${leagueId}/${subsessionId}.json`,
            {
                encoding: 'utf8',
                flag: 'r',
            }
        );

        for (let nan of nans) {
            strTelemetry = strTelemetry.replace(nan, '-1');
        }

        let ret: SubsessionTelemetry = <SubsessionTelemetry>(
            JSON.parse(strTelemetry)
        );

        return ret;
    } catch (e) {
        return null;
    }
}
