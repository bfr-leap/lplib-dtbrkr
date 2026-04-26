jest.mock('./ldata-loaders/ldata-stward-data-loader', () => ({
    getStewardRulingsAsync: jest.fn(),
}));

import {
    getAllRulings,
    getRulingsByDriver,
    getRulingsBySessionType,
    getStewardConfig,
    getAllStewardConfigs,
    setRaceControlChannelId,
    stewardHandler,
} from './stward';
import { sql } from './db';
import { getStewardRulingsAsync } from './ldata-loaders/ldata-stward-data-loader';

const sampleRulings = [
    {
        ruling_id: 'discord-1001',
        discord_user_id: 'discord-abc',
        driver_id: '111',
        league_id: '4534',
        season_id: '105035',
        session_type: 'Feature Race',
        lap: 12,
        classification: 'Major',
        infraction: 'Causing a collision',
        license_points: 4,
        sanctions: [
            {
                description: '5 point deduction',
                type: 'championship_point_deduction',
                value: 5,
            },
        ],
        evidence_urls: [],
        steward_notes: null,
        source_message_id: 'msg-1001',
        ruling_date: '2026-01-01',
    },
    {
        ruling_id: 'discord-1002',
        discord_user_id: 'discord-def',
        driver_id: '222',
        league_id: '4534',
        season_id: '105035',
        session_type: 'Qualifying',
        lap: null,
        classification: 'Minor',
        infraction: 'Track limits',
        license_points: 1,
        sanctions: [
            {
                description: '3 place grid penalty',
                type: 'time_penalty',
                value: 3,
            },
        ],
        evidence_urls: [],
        steward_notes: null,
        source_message_id: 'msg-1002',
        ruling_date: '2026-01-02',
    },
    {
        ruling_id: 'discord-1003',
        discord_user_id: 'discord-abc',
        driver_id: '111',
        league_id: '4534',
        season_id: '105035',
        session_type: 'Feature Race',
        lap: 20,
        classification: 'Minor',
        infraction: 'Unsafe rejoin',
        license_points: 1,
        sanctions: [],
        evidence_urls: [],
        steward_notes: null,
        source_message_id: 'msg-1003',
        ruling_date: '2026-01-03',
    },
];

function mockStwardData(payload: any) {
    (getStewardRulingsAsync as jest.Mock).mockResolvedValueOnce(payload);
}

describe('stward - data lake accessors', () => {
    beforeEach(() => {
        (getStewardRulingsAsync as jest.Mock).mockReset();
    });

    describe('getAllRulings', () => {
        test('returns rulings array when dataset is a bare array', async () => {
            mockStwardData(sampleRulings);
            const result = await getAllRulings('4534', '105035');
            expect(result).toHaveLength(3);
            expect(result[0].license_points).toBe(4);
            expect(result[0].sanctions[0].type).toBe(
                'championship_point_deduction'
            );

            expect(getStewardRulingsAsync).toHaveBeenCalledWith(4534, 105035);
        });

        test('unwraps { rulings: [...] } wrapper', async () => {
            // The loader's typed return is StewardRuling[], but ldataReadFile
            // doesn't validate shape — if a file on disk is { rulings: [...] }
            // the wrapper-unwrap defensive code in stward.ts still triggers.
            mockStwardData({ rulings: sampleRulings });
            const result = await getAllRulings('4534', '105035');
            expect(result).toHaveLength(3);
        });

        test('returns empty array when loader returns null', async () => {
            mockStwardData(null);
            const result = await getAllRulings('4534', '105035');
            expect(result).toEqual([]);
        });
    });

    describe('getRulingsByDriver', () => {
        test('filters by discord_user_id', async () => {
            mockStwardData(sampleRulings);
            const result = await getRulingsByDriver('4534', '105035', {
                discord_user_id: 'discord-abc',
            });
            expect(result).toHaveLength(2);
            expect(result.map((r) => r.ruling_id)).toEqual([
                'discord-1001',
                'discord-1003',
            ]);
        });

        test('filters by driver_id when discord_user_id not provided', async () => {
            mockStwardData(sampleRulings);
            const result = await getRulingsByDriver('4534', '105035', {
                driver_id: '222',
            });
            expect(result).toHaveLength(1);
            expect(result[0].ruling_id).toBe('discord-1002');
        });

        test('returns empty array when neither id matches', async () => {
            mockStwardData(sampleRulings);
            const result = await getRulingsByDriver('4534', '105035', {
                discord_user_id: 'nobody',
            });
            expect(result).toEqual([]);
        });
    });

    describe('getRulingsBySessionType', () => {
        test('filters by session_type', async () => {
            mockStwardData(sampleRulings);
            const result = await getRulingsBySessionType(
                '4534',
                '105035',
                'Feature Race'
            );
            expect(result).toHaveLength(2);
            expect(result.map((r) => r.ruling_id)).toEqual([
                'discord-1001',
                'discord-1003',
            ]);
        });

        test('returns empty array when no rulings match session type', async () => {
            mockStwardData(sampleRulings);
            const result = await getRulingsBySessionType(
                '4534',
                '105035',
                'Practice'
            );
            expect(result).toEqual([]);
        });
    });
});

describe('stward - steward_config accessors', () => {
    const testLeague = '919191';

    afterEach(async () => {
        await sql`DELETE FROM steward_config WHERE league_id = ${testLeague}`;
    });

    describe('getStewardConfig', () => {
        test('returns null when no config exists for the league', async () => {
            const result = await getStewardConfig(testLeague);
            expect(result).toBeNull();
        });

        test('returns config with race_control_channel_id after it is set', async () => {
            await setRaceControlChannelId(testLeague, 'channel-123');
            const result = await getStewardConfig(testLeague);
            expect(result).not.toBeNull();
            expect(result!.league_id).toBe(testLeague);
            expect(result!.race_control_channel_id).toBe('channel-123');
        });
    });

    describe('setRaceControlChannelId', () => {
        test('inserts a new row when league has no existing config', async () => {
            await setRaceControlChannelId(testLeague, 'new-channel');
            const { records } = await sql`
                SELECT race_control_channel_id FROM steward_config
                WHERE league_id = ${testLeague}`;
            expect(records).toHaveLength(1);
            expect((records[0] as any).race_control_channel_id).toBe(
                'new-channel'
            );
        });

        test('upserts the channel id on subsequent calls', async () => {
            await setRaceControlChannelId(testLeague, 'first');
            await setRaceControlChannelId(testLeague, 'second');

            const { records } = await sql`
                SELECT race_control_channel_id FROM steward_config
                WHERE league_id = ${testLeague}`;
            expect(records).toHaveLength(1);
            expect((records[0] as any).race_control_channel_id).toBe('second');
        });

        test('supports clearing the channel id by passing null', async () => {
            await setRaceControlChannelId(testLeague, 'something');
            await setRaceControlChannelId(testLeague, null);

            const result = await getStewardConfig(testLeague);
            expect(result).not.toBeNull();
            expect(result!.race_control_channel_id).toBeNull();
        });
    });
});

describe('stward - getAllStewardConfigs', () => {
    const testLeagues = ['getAll-111', 'getAll-222', 'getAll-333'];

    afterEach(async () => {
        for (const lg of testLeagues) {
            await sql`DELETE FROM steward_config WHERE league_id = ${lg}`;
        }
    });

    test('returns an empty array when no configs exist', async () => {
        // Ensure table is empty for test leagues
        const result = await getAllStewardConfigs();
        // Other tests may leave rows; just assert our test leagues are not present
        const ours = result.filter((r) => testLeagues.includes(r.league_id));
        expect(ours).toEqual([]);
    });

    test('returns every row including ones with null race_control_channel_id', async () => {
        await setRaceControlChannelId('getAll-111', 'rc-111');
        await setRaceControlChannelId('getAll-222', null);
        await sql`
            INSERT INTO steward_config (league_id, race_control_channel_id)
            VALUES (${'getAll-333'}, ${null})`;

        const all = await getAllStewardConfigs();
        const ours = all.filter((r) => testLeagues.includes(r.league_id));
        expect(ours).toHaveLength(3);

        const byLeague: Record<string, string | null> = {};
        for (const rec of ours) {
            expect(typeof rec.league_id).toBe('string');
            byLeague[rec.league_id] = rec.race_control_channel_id;
        }
        expect(byLeague['getAll-111']).toBe('rc-111');
        expect(byLeague['getAll-222']).toBeNull();
        expect(byLeague['getAll-333']).toBeNull();
    });
});

describe('stward - stewardHandler', () => {
    const testLeague = '828282';

    beforeEach(() => {
        (getStewardRulingsAsync as jest.Mock).mockReset();
    });

    afterEach(async () => {
        await sql`DELETE FROM steward_config WHERE league_id = ${testLeague}`;
    });

    test('routes "rulings" to getAllRulings', async () => {
        mockStwardData(sampleRulings);
        const result = await stewardHandler('ldata-stward', {
            type: 'rulings',
            league: '4534',
            season: '105035',
        });
        expect(result).toHaveLength(3);
    });

    test('routes "rulingsByDriver" with discord_user_id', async () => {
        mockStwardData(sampleRulings);
        const result = await stewardHandler('ldata-stward', {
            type: 'rulingsByDriver',
            league: '4534',
            season: '105035',
            discord_user_id: 'discord-abc',
        });
        expect(result).toHaveLength(2);
    });

    test('routes "rulingsBySessionType"', async () => {
        mockStwardData(sampleRulings);
        const result = await stewardHandler('ldata-stward', {
            type: 'rulingsBySessionType',
            league: '4534',
            season: '105035',
            sessionType: 'Qualifying',
        });
        expect(result).toHaveLength(1);
        expect(result[0].ruling_id).toBe('discord-1002');
    });

    test('routes "stewardConfig" to getStewardConfig', async () => {
        await setRaceControlChannelId(testLeague, 'ch-abc');
        const result = await stewardHandler('ldata-stward', {
            type: 'stewardConfig',
            league: testLeague,
        });
        expect(result).not.toBeNull();
        expect(result.race_control_channel_id).toBe('ch-abc');
    });

    test('routes "setRaceControlChannelId" and returns updated config', async () => {
        const result = await stewardHandler('ldata-stward', {
            type: 'setRaceControlChannelId',
            league: testLeague,
            race_control_channel_id: 'rc-channel',
        });
        expect(result).not.toBeNull();
        expect(result.league_id).toBe(testLeague);
        expect(result.race_control_channel_id).toBe('rc-channel');
    });

    test('returns null for unknown type', async () => {
        const result = await stewardHandler('ldata-stward', {
            type: 'unknown-op',
        });
        expect(result).toBeNull();
    });
});
