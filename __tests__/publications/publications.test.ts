import { createPublication, isSubsessionPublished } from '../../src/publications';
import { sql } from '../../src/db';

describe('publications', () => {
    afterEach(async () => {
        // Clean up test data
        await sql`DELETE FROM tracktalk_publications WHERE channel_id = ${'test_pub_channel'}`;
    });

    describe('createPublication', () => {
        test('inserts a publication record', async () => {
            await createPublication('test_pub_channel', 99001);

            const { records } = await sql`
                SELECT * FROM tracktalk_publications
                WHERE channel_id = ${'test_pub_channel'} AND subsession_id = ${99001}`;
            expect(records.length).toBe(1);

            const rec = records[0] as any;
            expect(rec.channel_id).toBe('test_pub_channel');
            expect(rec.subsession_id).toBe(99001);
        });

        test('allows multiple publications for different subsessions', async () => {
            await createPublication('test_pub_channel', 99001);
            await createPublication('test_pub_channel', 99002);

            const { records } = await sql`
                SELECT * FROM tracktalk_publications
                WHERE channel_id = ${'test_pub_channel'}`;
            expect(records.length).toBe(2);
        });
    });

    describe('isSubsessionPublished', () => {
        test('returns false when subsession has not been published', async () => {
            const result = await isSubsessionPublished(88888);
            expect(result).toBe(false);
        });

        test('returns true when subsession has been published', async () => {
            await createPublication('test_pub_channel', 99003);
            const result = await isSubsessionPublished(99003);
            expect(result).toBe(true);
        });
    });
});
