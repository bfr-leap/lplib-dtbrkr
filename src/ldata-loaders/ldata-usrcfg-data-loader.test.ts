import type { Mock } from 'vitest';
vi.mock('fs');
vi.mock('fs/promises');

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import {
    getActiveLeagueSchedule,
    getActiveLeagueScheduleAsync,
} from './ldata-usrcfg-data-loader';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('getActiveLeagueSchedule', () => {
    it('reads and parses activeLeagueSchedule.json', () => {
        (readFileSync as Mock).mockReturnValue('{"leagues":[]}');
        expect(getActiveLeagueSchedule()).toEqual({ leagues: [] });
        expect(readFileSync).toHaveBeenCalledWith(
            './public/data/ldata-usrcfg/activeLeagueSchedule.json',
            expect.any(Object)
        );
    });
});

describe('getActiveLeagueScheduleAsync', () => {
    it('reads and parses activeLeagueSchedule.json', async () => {
        (readFile as Mock).mockResolvedValue('{"leagues":[]}');
        await expect(getActiveLeagueScheduleAsync()).resolves.toEqual({
            leagues: [],
        });
        expect(readFile).toHaveBeenCalledWith(
            './public/data/ldata-usrcfg/activeLeagueSchedule.json',
            expect.any(Object)
        );
    });
});
