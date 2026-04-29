import {
    createRawMessageIngest,
    loadUserIdsForChannel,
    deleteAllRawMessageIngest,
    getTracktalkMessagesForChannel,
    upsertDiscordUserMapping,
    loadDiscordUserMappings,
    getGuildIdForChannel,
} from './msgingest';
import { sql } from './db';

describe('msgingest', () => {
    describe('createRawMessageIngest', () => {
        test('inserts a message record into the database', async () => {
            const msg = {
                contents: 'test message',
                author_id: 'test_author_001',
                author_username: 'testuser',
                author_global_name: 'Test User',
                guild_id: 'test_guild',
                channel_id: 'test_channel',
                channel_name: 'test-channel-name',
            };

            await createRawMessageIngest(msg);

            const { records } = await sql`
                SELECT * FROM tracktalk_raw_message_ingest
                WHERE author_id = ${'test_author_001'} AND contents = ${'test message'}`;
            expect(records.length).toBeGreaterThanOrEqual(1);

            const rec = records[0] as any;
            expect(rec.contents).toBe('test message');
            expect(rec.author_id).toBe('test_author_001');
            expect(rec.author_username).toBe('testuser');
            expect(rec.author_global_name).toBe('Test User');
            expect(rec.guild_id).toBe('test_guild');
            expect(rec.channel_id).toBe('test_channel');
            expect(rec.channel_name).toBe('test-channel-name');
            expect(rec.created_at).toBeDefined();

            // cleanup
            await sql`DELETE FROM tracktalk_raw_message_ingest WHERE author_id = ${'test_author_001'}`;
        });
    });

    describe('deleteAllRawMessageIngest', () => {
        test('removes all records from the table', async () => {
            // Insert a couple of records
            await createRawMessageIngest({
                contents: 'msg1', author_id: 'del_test_1', author_username: 'u1',
                author_global_name: 'User One', guild_id: 'g1', channel_id: 'c1', channel_name: 'ch1',
            });
            await createRawMessageIngest({
                contents: 'msg2', author_id: 'del_test_2', author_username: 'u2',
                author_global_name: 'User Two', guild_id: 'g1', channel_id: 'c1', channel_name: 'ch1',
            });

            await deleteAllRawMessageIngest();

            const { records } = await sql`SELECT COUNT(*) as cnt FROM tracktalk_raw_message_ingest`;
            expect((records[0] as any).cnt).toBe(0);
        });

        afterAll(async () => {
            // Re-seed the test data that other tests may depend on.
            const { seedTracktalkRawMessageIngest } = await import(
                './test-setup/seed/seed-tracktalk-raw-message-ingest'
            );
            await seedTracktalkRawMessageIngest();
        });
    });

    describe('getTracktalkMessagesForChannel', () => {
        const testChannel = 'gtmfc_channel_A';
        const otherChannel = 'gtmfc_channel_B';

        afterEach(async () => {
            await sql`DELETE FROM tracktalk_raw_message_ingest WHERE channel_id IN (${testChannel}, ${otherChannel})`;
        });

        test('returns empty array when no messages exist for the channel', async () => {
            const result = await getTracktalkMessagesForChannel(
                'nonexistent_channel_for_gtmfc'
            );
            expect(result).toEqual([]);
        });

        test('returns messages for the channel with full shape', async () => {
            await sql`
                INSERT INTO tracktalk_raw_message_ingest
                (contents, author_id, author_username, author_global_name,
                 guild_id, channel_id, channel_name, created_at)
                VALUES (${'first'}, ${'a1'}, ${'uname1'}, ${'Global One'},
                        ${'g1'}, ${testChannel}, ${'chan-A'}, ${'2026-03-09 10:00:00'})`;

            const result = await getTracktalkMessagesForChannel(testChannel);
            expect(result).toHaveLength(1);
            const rec = result[0];
            expect(typeof rec.id).toBe('number');
            expect(rec.contents).toBe('first');
            expect(rec.author_id).toBe('a1');
            expect(rec.author_username).toBe('uname1');
            expect(rec.author_global_name).toBe('Global One');
            expect(rec.guild_id).toBe('g1');
            expect(rec.channel_id).toBe(testChannel);
            expect(rec.channel_name).toBe('chan-A');
            expect(rec.created_at).toBe('2026-03-09 10:00:00');
        });

        test('excludes messages from other channels', async () => {
            await sql`
                INSERT INTO tracktalk_raw_message_ingest
                (contents, author_id, author_username, author_global_name,
                 guild_id, channel_id, channel_name, created_at)
                VALUES (${'mine'}, ${'a1'}, ${'u'}, ${'G'},
                        ${'g1'}, ${testChannel}, ${'chan-A'}, ${'2026-03-09 10:00:00'})`;
            await sql`
                INSERT INTO tracktalk_raw_message_ingest
                (contents, author_id, author_username, author_global_name,
                 guild_id, channel_id, channel_name, created_at)
                VALUES (${'not mine'}, ${'a2'}, ${'u2'}, ${'G2'},
                        ${'g1'}, ${otherChannel}, ${'chan-B'}, ${'2026-03-09 10:00:00'})`;

            const result = await getTracktalkMessagesForChannel(testChannel);
            expect(result).toHaveLength(1);
            expect(result[0].contents).toBe('mine');
        });

        test('orders messages by created_at ASC, id ASC (oldest first)', async () => {
            await sql`
                INSERT INTO tracktalk_raw_message_ingest
                (contents, author_id, author_username, author_global_name,
                 guild_id, channel_id, channel_name, created_at)
                VALUES (${'second'}, ${'a'}, ${'u'}, ${'G'},
                        ${'g1'}, ${testChannel}, ${'chan-A'}, ${'2026-03-09 11:00:00'})`;
            await sql`
                INSERT INTO tracktalk_raw_message_ingest
                (contents, author_id, author_username, author_global_name,
                 guild_id, channel_id, channel_name, created_at)
                VALUES (${'first'}, ${'a'}, ${'u'}, ${'G'},
                        ${'g1'}, ${testChannel}, ${'chan-A'}, ${'2026-03-09 10:00:00'})`;
            // Two rows with identical created_at — lower id should come first.
            await sql`
                INSERT INTO tracktalk_raw_message_ingest
                (contents, author_id, author_username, author_global_name,
                 guild_id, channel_id, channel_name, created_at)
                VALUES (${'tie-a'}, ${'a'}, ${'u'}, ${'G'},
                        ${'g1'}, ${testChannel}, ${'chan-A'}, ${'2026-03-09 12:00:00'})`;
            await sql`
                INSERT INTO tracktalk_raw_message_ingest
                (contents, author_id, author_username, author_global_name,
                 guild_id, channel_id, channel_name, created_at)
                VALUES (${'tie-b'}, ${'a'}, ${'u'}, ${'G'},
                        ${'g1'}, ${testChannel}, ${'chan-A'}, ${'2026-03-09 12:00:00'})`;

            const result = await getTracktalkMessagesForChannel(testChannel);
            expect(result.map((r) => r.contents)).toEqual([
                'first',
                'second',
                'tie-a',
                'tie-b',
            ]);
            // id of tie-a < id of tie-b (insertion order)
            expect(result[2].id).toBeLessThan(result[3].id);
        });
    });

    describe('upsertDiscordUserMapping', () => {
        afterEach(async () => {
            await sql`DELETE FROM discord_user_mappings WHERE guild_id IN (${'test_guild_um'}, ${'test_guild_um2'})`;
        });

        test('inserts a new mapping', async () => {
            await upsertDiscordUserMapping({
                user_id: 'u1',
                display_name: 'UserOne',
                username: 'userone',
                guild_id: 'test_guild_um',
            });

            const { records } = await sql`
                SELECT user_id, display_name, username, guild_id
                FROM discord_user_mappings
                WHERE guild_id = ${'test_guild_um'}`;
            expect(records).toHaveLength(1);
            const rec = records[0] as any;
            expect(rec.user_id).toBe('u1');
            expect(rec.display_name).toBe('UserOne');
            expect(rec.username).toBe('userone');
        });

        test('upserts on conflict — updates display_name and username', async () => {
            await upsertDiscordUserMapping({
                user_id: 'u1',
                display_name: 'OldName',
                username: 'olduser',
                guild_id: 'test_guild_um',
            });
            await upsertDiscordUserMapping({
                user_id: 'u1',
                display_name: 'NewName',
                username: 'newuser',
                guild_id: 'test_guild_um',
            });

            const { records } = await sql`
                SELECT display_name, username
                FROM discord_user_mappings
                WHERE user_id = ${'u1'} AND guild_id = ${'test_guild_um'}`;
            expect(records).toHaveLength(1);
            expect((records[0] as any).display_name).toBe('NewName');
            expect((records[0] as any).username).toBe('newuser');
        });

        test('same user_id in different guilds creates separate rows', async () => {
            await upsertDiscordUserMapping({
                user_id: 'u1',
                display_name: 'Guild1Name',
                username: 'user1',
                guild_id: 'test_guild_um',
            });
            await upsertDiscordUserMapping({
                user_id: 'u1',
                display_name: 'Guild2Name',
                username: 'user1',
                guild_id: 'test_guild_um2',
            });

            const { records } = await sql`
                SELECT * FROM discord_user_mappings
                WHERE user_id = ${'u1'} AND guild_id IN (${'test_guild_um'}, ${'test_guild_um2'})`;
            expect(records).toHaveLength(2);
        });
    });

    describe('loadDiscordUserMappings', () => {
        afterEach(async () => {
            await sql`DELETE FROM discord_user_mappings WHERE guild_id IN (${'test_guild_lm'}, ${'test_guild_lm2'})`;
        });

        test('returns empty array when no mappings exist', async () => {
            const result = await loadDiscordUserMappings('nonexistent_guild');
            expect(result).toEqual([]);
        });

        test('returns all mappings for the given guild', async () => {
            await upsertDiscordUserMapping({ user_id: 'u1', display_name: 'One', username: 'one', guild_id: 'test_guild_lm' });
            await upsertDiscordUserMapping({ user_id: 'u2', display_name: 'Two', username: 'two', guild_id: 'test_guild_lm' });

            const result = await loadDiscordUserMappings('test_guild_lm');
            expect(result).toHaveLength(2);
            const ids = result.map((r) => r.user_id).sort();
            expect(ids).toEqual(['u1', 'u2']);
        });

        test('does not return mappings from other guilds', async () => {
            await upsertDiscordUserMapping({ user_id: 'u1', display_name: 'One', username: 'one', guild_id: 'test_guild_lm' });
            await upsertDiscordUserMapping({ user_id: 'u2', display_name: 'Two', username: 'two', guild_id: 'test_guild_lm2' });

            const result = await loadDiscordUserMappings('test_guild_lm');
            expect(result).toHaveLength(1);
            expect(result[0].user_id).toBe('u1');
        });

        test('returns correct shape with display_name and username', async () => {
            await upsertDiscordUserMapping({ user_id: 'u1', display_name: 'Display', username: 'uname', guild_id: 'test_guild_lm' });

            const result = await loadDiscordUserMappings('test_guild_lm');
            expect(result[0]).toEqual({
                user_id: 'u1',
                display_name: 'Display',
                username: 'uname',
            });
        });
    });

    describe('getGuildIdForChannel', () => {
        const testChannelA = 'ggidc_channel_A';
        const testChannelB = 'ggidc_channel_B';
        const testGuildA = 'ggidc_guild_A';
        const testGuildB = 'ggidc_guild_B';

        afterEach(async () => {
            await sql`DELETE FROM tracktalk_raw_message_ingest WHERE channel_id IN (${testChannelA}, ${testChannelB})`;
        });

        test('returns null when no messages exist for the channel', async () => {
            const result = await getGuildIdForChannel('nonexistent_channel_for_ggidc');
            expect(result).toBeNull();
        });

        test('returns the guild_id of an ingested message for the channel', async () => {
            await createRawMessageIngest({
                contents: 'hi',
                author_id: 'a1',
                author_username: 'u1',
                author_global_name: 'User One',
                guild_id: testGuildA,
                channel_id: testChannelA,
                channel_name: 'chan-A',
            });

            const result = await getGuildIdForChannel(testChannelA);
            expect(result).toBe(testGuildA);
        });

        test('scopes lookup per channel', async () => {
            await createRawMessageIngest({
                contents: 'a',
                author_id: 'a1',
                author_username: 'u1',
                author_global_name: 'U1',
                guild_id: testGuildA,
                channel_id: testChannelA,
                channel_name: 'chan-A',
            });
            await createRawMessageIngest({
                contents: 'b',
                author_id: 'a2',
                author_username: 'u2',
                author_global_name: 'U2',
                guild_id: testGuildB,
                channel_id: testChannelB,
                channel_name: 'chan-B',
            });

            expect(await getGuildIdForChannel(testChannelA)).toBe(testGuildA);
            expect(await getGuildIdForChannel(testChannelB)).toBe(testGuildB);
        });

        test('returns a single string when channel has multiple ingested messages', async () => {
            await createRawMessageIngest({
                contents: 'm1',
                author_id: 'a1',
                author_username: 'u1',
                author_global_name: 'U1',
                guild_id: testGuildA,
                channel_id: testChannelA,
                channel_name: 'chan-A',
            });
            await createRawMessageIngest({
                contents: 'm2',
                author_id: 'a2',
                author_username: 'u2',
                author_global_name: 'U2',
                guild_id: testGuildA,
                channel_id: testChannelA,
                channel_name: 'chan-A',
            });
            await createRawMessageIngest({
                contents: 'm3',
                author_id: 'a3',
                author_username: 'u3',
                author_global_name: 'U3',
                guild_id: testGuildA,
                channel_id: testChannelA,
                channel_name: 'chan-A',
            });

            const result = await getGuildIdForChannel(testChannelA);
            expect(typeof result).toBe('string');
            expect(result).toBe(testGuildA);
        });
    });

    describe('loadUserIdsForChannel', () => {
        test('returns a map of cleaned names to mention tags for a channel', async () => {
            const result = await loadUserIdsForChannel('channel_001');

            // Should contain users from guild_001 (same guild as channel_001)
            expect(Object.keys(result).length).toBeGreaterThan(0);
        });

        test('returns most recent global name for each author_id', async () => {
            // author_id 111222333 appears twice: as 'RacerOne' and 'RacerOneRenamed'
            // The most recent entry should be used
            const result = await loadUserIdsForChannel('channel_001');

            // Should have the renamed version (most recent)
            expect(result['RacerOneRenamed']).toBe('<@111222333>');
            // Should NOT have the old name
            expect(result['RacerOne']).toBeUndefined();
        });

        test('returns users from the same guild even if from different channels', async () => {
            const result = await loadUserIdsForChannel('channel_001');

            // RacerTwo is in channel_001 (same guild_001), so should be present
            expect(result['RacerTwo']).toBe('<@444555666>');
        });

        test('does not include users from other guilds', async () => {
            const result = await loadUserIdsForChannel('channel_001');

            // OtherDriver is in guild_002, should not appear
            expect(result['OtherDriver']).toBeUndefined();
        });

        test('returns empty object for unknown channel', async () => {
            const result = await loadUserIdsForChannel('nonexistent_channel');
            expect(result).toEqual({});
        });
    });
});
