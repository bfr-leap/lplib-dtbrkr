import {
    ldataWriteFile,
    ldataWriteFileAsync,
    ldataReadFile,
    ldataReadFileAsync,
} from './fsutil';
import { PodcastScriptedSrc } from 'ir-endpoint-types';

const MNT_PT = './public/data/ldata-pdcsrc/';

export function getSimsessionPodcastScriptedSrc(
    subsessionId: number,
    simsessionNumber: number
): PodcastScriptedSrc | null {
    return ldataReadFile<PodcastScriptedSrc>(
        MNT_PT,
        'simsessionPodcastScriptedSrc',
        [subsessionId, simsessionNumber]
    );
}

export function getSimsessionPodcastScriptedSrcAsync(
    subsessionId: number,
    simsessionNumber: number
): Promise<PodcastScriptedSrc | null> {
    return ldataReadFileAsync<PodcastScriptedSrc>(
        MNT_PT,
        'simsessionPodcastScriptedSrc',
        [subsessionId, simsessionNumber]
    );
}

export function saveSimsessionPodcastScriptedSrc(
    subsessionId: number,
    simsessionNumber: number,
    dataset: PodcastScriptedSrc
): void {
    ldataWriteFile(dataset, MNT_PT, 'simsessionPodcastScriptedSrc', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveSimsessionPodcastScriptedSrcAsync(
    subsessionId: number,
    simsessionNumber: number,
    dataset: PodcastScriptedSrc
): Promise<void> {
    return ldataWriteFileAsync(
        dataset,
        MNT_PT,
        'simsessionPodcastScriptedSrc',
        [subsessionId, simsessionNumber]
    );
}
