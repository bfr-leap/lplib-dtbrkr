jest.mock('fs');
jest.mock('fs/promises');
jest.mock('./kafka-notify', () => ({ notifyWrite: jest.fn() }));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import {
    getSimsessionSummary,
    saveSimsessionSummary,
    getDotdProfile,
    saveDotdProfile,
    getDotdManifest,
    saveDotdManifest,
    getSimsessionSummaryAsync,
    saveSimsessionSummaryAsync,
    getDotdProfileAsync,
    saveDotdProfileAsync,
    getDotdManifestAsync,
    saveDotdManifestAsync,
} from './ldata-gentxt-data-loader';

const MNT = './public/data/ldata-gentxt/';

beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
    (stat as jest.Mock).mockResolvedValue({});
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
});

describe('simsessionSummary', () => {
    it('reads from the expected path', () => {
        (readFileSync as jest.Mock).mockReturnValue('{"text":"ok"}');
        expect(getSimsessionSummary(111, 0)).toEqual({ text: 'ok' });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}simsessionSummary/111/0.json`,
            expect.any(Object)
        );
    });

    it('returns null on missing file', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getSimsessionSummary(111, 0)).toBeNull();
    });

    it('writes to the expected path', () => {
        saveSimsessionSummary(111, 0, { text: 'ok' } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}simsessionSummary/111/0.json`,
            '{"text":"ok"}'
        );
    });
});

describe('dotdProfile', () => {
    it('reads by (leagueId, custId)', () => {
        (readFileSync as jest.Mock).mockReturnValue('{"name":"a"}');
        expect(getDotdProfile(42, 999)).toEqual({ name: 'a' });
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}dotdProfile/42/999.json`,
            expect.any(Object)
        );
    });

    it('writes by (leagueId, custId)', () => {
        saveDotdProfile(42, 999, { name: 'a' } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}dotdProfile/42/999.json`,
            '{"name":"a"}'
        );
    });
});

describe('dotdManifest', () => {
    it('returns an empty array when the file does not exist', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getDotdManifest(42, 7)).toEqual([]);
    });

    it('returns the parsed array when present', () => {
        (readFileSync as jest.Mock).mockReturnValue('[{"id":1}]');
        expect(getDotdManifest(42, 7)).toEqual([{ id: 1 }]);
    });

    it('writes to the expected path', () => {
        saveDotdManifest(42, 7, [{ id: 1 }] as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}dotdManifest/42/7.json`,
            '[{"id":1}]'
        );
    });
});

describe('simsessionSummary async', () => {
    it('reads from the expected path', async () => {
        (readFile as jest.Mock).mockResolvedValue('{"text":"ok"}');
        await expect(getSimsessionSummaryAsync(111, 0)).resolves.toEqual({
            text: 'ok',
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}simsessionSummary/111/0.json`,
            expect.any(Object)
        );
    });

    it('returns null on missing file', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getSimsessionSummaryAsync(111, 0)).resolves.toBeNull();
    });

    it('writes to the expected path', async () => {
        await saveSimsessionSummaryAsync(111, 0, { text: 'ok' } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}simsessionSummary/111/0.json`,
            '{"text":"ok"}'
        );
    });
});

describe('dotdProfile async', () => {
    it('reads by (leagueId, custId)', async () => {
        (readFile as jest.Mock).mockResolvedValue('{"name":"a"}');
        await expect(getDotdProfileAsync(42, 999)).resolves.toEqual({
            name: 'a',
        });
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}dotdProfile/42/999.json`,
            expect.any(Object)
        );
    });

    it('writes by (leagueId, custId)', async () => {
        await saveDotdProfileAsync(42, 999, { name: 'a' } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}dotdProfile/42/999.json`,
            '{"name":"a"}'
        );
    });
});

describe('dotdManifest async', () => {
    it('returns an empty array when the file does not exist', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getDotdManifestAsync(42, 7)).resolves.toEqual([]);
    });

    it('returns the parsed array when present', async () => {
        (readFile as jest.Mock).mockResolvedValue('[{"id":1}]');
        await expect(getDotdManifestAsync(42, 7)).resolves.toEqual([{ id: 1 }]);
    });

    it('writes to the expected path', async () => {
        await saveDotdManifestAsync(42, 7, [{ id: 1 }] as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}dotdManifest/42/7.json`,
            '[{"id":1}]'
        );
    });
});
