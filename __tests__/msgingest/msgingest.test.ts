import { createRawMessageIngest, loadUserIdsForChannel, deleteAllRawMessageIngest } from '../../src/msgingest';
import { sql } from '../../src/db';

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
            // Re-seed the test data that other tests may depend on
            const { uploadTracktalkRawMessageIngest } = require('../xatautl/ul-tracktalk-raw-message-ingest');
            await uploadTracktalkRawMessageIngest();
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
