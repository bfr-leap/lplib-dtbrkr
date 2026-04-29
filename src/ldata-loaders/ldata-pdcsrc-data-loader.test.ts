import type { Mock } from 'vitest';
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('./kafka-notify', () => ({ notifyWrite: vi.fn() }));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import {
    getSimsessionPodcastScriptedSrc,
    saveSimsessionPodcastScriptedSrc,
    getSimsessionPodcastScriptedSrcAsync,
    saveSimsessionPodcastScriptedSrcAsync,
} from './ldata-pdcsrc-data-loader';

const MNT = './public/data/ldata-pdcsrc/';

beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as Mock).mockReturnValue(true);
    (stat as Mock).mockResolvedValue({});
    (writeFile as Mock).mockResolvedValue(undefined);
    (mkdir as Mock).mockResolvedValue(undefined);
});

describe('simsessionPodcastScriptedSrc', () => {
    it('reads from the expected nested path', () => {
        (readFileSync as Mock).mockReturnValue('{"script":"x"}');
        expect(getSimsessionPodcastScriptedSrc(111, 0)).toEqual({
            script: 'x',
        });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simsessionPodcastScriptedSrc/111/0.json`,
            expect.any(Object)
        );
    });

    it('returns null on missing file', () => {
        (readFileSync as Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getSimsessionPodcastScriptedSrc(111, 0)).toBeNull();
    });

    it('writes to the expected nested path', () => {
        saveSimsessionPodcastScriptedSrc(111, 0, { script: 'x' } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}simsessionPodcastScriptedSrc/111/0.json`,
            '{"script":"x"}'
        );
    });
});

describe('simsessionPodcastScriptedSrc async', () => {
    it('reads from the expected nested path', async () => {
        (readFile as Mock).mockResolvedValue('{"script":"x"}');
        await expect(
            getSimsessionPodcastScriptedSrcAsync(111, 0)
        ).resolves.toEqual({ script: 'x' });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}simsessionPodcastScriptedSrc/111/0.json`,
            expect.any(Object)
        );
    });

    it('returns null on missing file', async () => {
        (readFile as Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(
            getSimsessionPodcastScriptedSrcAsync(111, 0)
        ).resolves.toBeNull();
    });

    it('writes to the expected nested path', async () => {
        await saveSimsessionPodcastScriptedSrcAsync(111, 0, {
            script: 'x',
        } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}simsessionPodcastScriptedSrc/111/0.json`,
            '{"script":"x"}'
        );
    });
});
