import {
    ldataWriteFile,
    ldataWriteFileAsync,
    ldataReadFile,
    ldataReadFileAsync,
} from './fsutil';
import { ChartTable } from 'ir-endpoints-types';

const MNT_PT = './public/data/ldata-charts/';

export function getStartFinishChartData(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): ChartTable | null {
    return ldataReadFile<ChartTable>(MNT_PT, 'startFinishChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getStartFinishChartDataAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): Promise<ChartTable | null> {
    return ldataReadFileAsync<ChartTable>(MNT_PT, 'startFinishChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveStartFinishChartData(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): void {
    ldataWriteFile(dataset, MNT_PT, 'startFinishChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveStartFinishChartDataAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'startFinishChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getCumulativeDeltaChartData(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): ChartTable | null {
    return ldataReadFile<ChartTable>(MNT_PT, 'cumulativeDeltaChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function getCumulativeDeltaChartDataAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number
): Promise<ChartTable | null> {
    return ldataReadFileAsync<ChartTable>(MNT_PT, 'cumulativeDeltaChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveCumulativeDeltaChartData(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): void {
    ldataWriteFile(dataset, MNT_PT, 'cumulativeDeltaChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveCumulativeDeltaChartDataAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'cumulativeDeltaChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveCumulativeDeltaBestLapChartData(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): void {
    ldataWriteFile(dataset, MNT_PT, 'cumulativeDeltaBestLapChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveCumulativeDeltaBestLapChartDataAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): Promise<void> {
    return ldataWriteFileAsync(
        dataset,
        MNT_PT,
        'cumulativeDeltaBestLapChartData',
        [leagueId, subsessionId, simsessionNumber]
    );
}

export function savePacePercentVsIdealLapChartData(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): void {
    ldataWriteFile(dataset, MNT_PT, 'pacePercentVsIdealLapChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function savePacePercentVsIdealLapChartDataAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): Promise<void> {
    return ldataWriteFileAsync(
        dataset,
        MNT_PT,
        'pacePercentVsIdealLapChartData',
        [leagueId, subsessionId, simsessionNumber]
    );
}

export function savePacePercentChartData(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): void {
    ldataWriteFile(dataset, MNT_PT, 'pacePercentChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}

export function savePacePercentChartDataAsync(
    leagueId: number,
    subsessionId: number,
    simsessionNumber: number,
    dataset: ChartTable
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'pacePercentChartData', [
        leagueId,
        subsessionId,
        simsessionNumber,
    ]);
}
