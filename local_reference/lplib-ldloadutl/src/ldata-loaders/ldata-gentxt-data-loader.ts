import {
    ldataWriteFile,
    ldataWriteFileAsync,
    ldataReadFile,
    ldataReadFileAsync,
} from './fsutil';
import type {
    GeneratedSimsessionSummary,
    DotdProfileData,
    DotdManifestEntry,
} from 'ir-endpoints-types';

const MNT_PT = './public/data/ldata-gentxt/';

export function getSimsessionSummary(
    subsessionId: number,
    simsessionNumber: number
): GeneratedSimsessionSummary | null {
    return ldataReadFile<GeneratedSimsessionSummary>(
        MNT_PT,
        'simsessionSummary',
        [subsessionId, simsessionNumber]
    );
}

export function getSimsessionSummaryAsync(
    subsessionId: number,
    simsessionNumber: number
): Promise<GeneratedSimsessionSummary | null> {
    return ldataReadFileAsync<GeneratedSimsessionSummary>(
        MNT_PT,
        'simsessionSummary',
        [subsessionId, simsessionNumber]
    );
}

export function saveSimsessionSummary(
    subsessionId: number,
    simsessionNumber: number,
    dataset: GeneratedSimsessionSummary
): void {
    ldataWriteFile(dataset, MNT_PT, 'simsessionSummary', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveSimsessionSummaryAsync(
    subsessionId: number,
    simsessionNumber: number,
    dataset: GeneratedSimsessionSummary
): Promise<void> {
    return ldataWriteFileAsync(dataset, MNT_PT, 'simsessionSummary', [
        subsessionId,
        simsessionNumber,
    ]);
}

// todo: add [get/save]SimsessionHighlight/

export function getDotdProfile(
    leagueId: number,
    custId: number
): DotdProfileData | null {
    return ldataReadFile<DotdProfileData>(MNT_PT, 'dotdProfile', [
        leagueId,
        custId,
    ]);
}

export function getDotdProfileAsync(
    leagueId: number,
    custId: number
): Promise<DotdProfileData | null> {
    return ldataReadFileAsync<DotdProfileData>(MNT_PT, 'dotdProfile', [
        leagueId,
        custId,
    ]);
}

export function saveDotdProfile(
    leagueId: number,
    custId: number,
    profile: DotdProfileData
): void {
    ldataWriteFile(profile, MNT_PT, 'dotdProfile', [leagueId, custId]);
}

export function saveDotdProfileAsync(
    leagueId: number,
    custId: number,
    profile: DotdProfileData
): Promise<void> {
    return ldataWriteFileAsync(profile, MNT_PT, 'dotdProfile', [
        leagueId,
        custId,
    ]);
}

export function getDotdManifest(
    leagueId: number,
    seasonId: number
): DotdManifestEntry[] {
    return (
        ldataReadFile<DotdManifestEntry[]>(MNT_PT, 'dotdManifest', [
            leagueId,
            seasonId,
        ]) ?? []
    );
}

export async function getDotdManifestAsync(
    leagueId: number,
    seasonId: number
): Promise<DotdManifestEntry[]> {
    return (
        (await ldataReadFileAsync<DotdManifestEntry[]>(MNT_PT, 'dotdManifest', [
            leagueId,
            seasonId,
        ])) ?? []
    );
}

export function saveDotdManifest(
    leagueId: number,
    seasonId: number,
    manifest: DotdManifestEntry[]
): void {
    ldataWriteFile(manifest, MNT_PT, 'dotdManifest', [leagueId, seasonId]);
}

export function saveDotdManifestAsync(
    leagueId: number,
    seasonId: number,
    manifest: DotdManifestEntry[]
): Promise<void> {
    return ldataWriteFileAsync(manifest, MNT_PT, 'dotdManifest', [
        leagueId,
        seasonId,
    ]);
}
