import {
    getAllRulings,
    getRulingsByDriver,
    getRulingsBySessionType,
    getStewardConfig,
    setRaceControlChannelId,
    stewardHandler,
} from '../../src/stward';
import { sql } from '../../src/db';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

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

function mockStwardFetch(payload: any) {
    mockFetch.mockResolvedValueOnce({
        json: async () => payload,
    });
}

describe('stward - data lake accessors', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('getAllRulings', () => {
        test('returns rulings array when dataset is a bare array', async () => {
            mockStwardFetch(sampleRulings);
            const result = await getAllRulings('4534', '105035');
            expect(result).toHaveLength(3);
            expect(result[0].license_points).toBe(4);
            expect(result[0].sanctions[0].type).toBe(
                'championship_point_deduction'
            );

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('ldata-stward');
            expect(calledUrl).toContain('rulings');
            expect(calledUrl).toContain('/4534');
            expect(calledUrl).toContain('/105035');
        });

        test('unwraps { rulings: [...] } wrapper', async () => {
            mockStwardFetch({ rulings: sampleRulings });
            const result = await getAllRulings('4534', '105035');
            expect(result).toHaveLength(3);
        });

        test('returns empty array when fetch returns null', async () => {
            mockFetch.mockRejectedValueOnce(new Error('not found'));
            const result = await getAllRulings('4534', '105035');
            expect(result).toEqual([]);
        });
    });

    describe('getRulingsByDriver', () => {
        test('filters by discord_user_id', async () => {
            mockStwardFetch(sampleRulings);
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
            mockStwardFetch(sampleRulings);
            const result = await getRulingsByDriver('4534', '105035', {
                driver_id: '222',
            });
            expect(result).toHaveLength(1);
            expect(result[0].ruling_id).toBe('discord-1002');
        });

        test('returns empty array when neither id matches', async () => {
            mockStwardFetch(sampleRulings);
            const result = await getRulingsByDriver('4534', '105035', {
                discord_user_id: 'nobody',
            });
            expect(result).toEqual([]);
        });
    });

    describe('getRulingsBySessionType', () => {
        test('filters by session_type', async () => {
            mockStwardFetch(sampleRulings);
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
            mockStwardFetch(sampleRulings);
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

describe('stward - stewardHandler', () => {
    const testLeague = '828282';

    beforeEach(() => {
        mockFetch.mockReset();
    });

    afterEach(async () => {
        await sql`DELETE FROM steward_config WHERE league_id = ${testLeague}`;
    });

    test('routes "rulings" to getAllRulings', async () => {
        mockStwardFetch(sampleRulings);
        const result = await stewardHandler('ldata-stward', {
            type: 'rulings',
            league: '4534',
            season: '105035',
        });
        expect(result).toHaveLength(3);
    });

    test('routes "rulingsByDriver" with discord_user_id', async () => {
        mockStwardFetch(sampleRulings);
        const result = await stewardHandler('ldata-stward', {
            type: 'rulingsByDriver',
            league: '4534',
            season: '105035',
            discord_user_id: 'discord-abc',
        });
        expect(result).toHaveLength(2);
    });

    test('routes "rulingsBySessionType"', async () => {
        mockStwardFetch(sampleRulings);
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
