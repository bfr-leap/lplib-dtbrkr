import { deleteAllRawMessageIngest } from '../../src/msgingest';
import { sql } from '../../src/db';

export async function uploadTracktalkRawMessageIngest() {
    console.log('uploadTracktalkRawMessageIngest() start');

    await deleteAllRawMessageIngest();

    for (let rec of tracktalkRawMessageIngest()) {
        await sql`
            INSERT INTO tracktalk_raw_message_ingest
            (contents, author_id, author_username, author_global_name, guild_id, channel_id, channel_name, created_at)
            VALUES (${rec.contents}, ${rec.author_id}, ${''}, ${rec.author_global_name},
                    ${rec.guild_id}, ${rec.channel_id}, ${rec.channel_name}, ${rec.created_at})`;
    }
}

// Fixture dates are generated at runtime (hours-ago, not a fixed date) so
// that the `loadUserIdsForChannel` query's `created_at >= datetime('now', '-7 days')`
// filter always matches, regardless of when the test suite is run.
function hoursAgo(h: number): string {
    const d = new Date(Date.now() - h * 60 * 60 * 1000);
    // sqlite datetime('now') format: 'YYYY-MM-DD HH:MM:SS' (UTC)
    return d.toISOString().replace('T', ' ').slice(0, 19);
}

function tracktalkRawMessageIngest() {
    return [
        {
            contents: 'Hello from the race!',
            author_id: '111222333',
            author_global_name: 'RacerOne',
            guild_id: 'guild_001',
            channel_id: 'channel_001',
            channel_name: 'race-chat',
            created_at: hoursAgo(3),
        },
        {
            contents: 'Great lap!',
            author_id: '444555666',
            author_global_name: 'RacerTwo',
            guild_id: 'guild_001',
            channel_id: 'channel_001',
            channel_name: 'race-chat',
            created_at: hoursAgo(2),
        },
        {
            contents: 'Close battle in turn 3',
            author_id: '111222333',
            author_global_name: 'RacerOneRenamed',
            guild_id: 'guild_001',
            channel_id: 'channel_002',
            channel_name: 'general',
            created_at: hoursAgo(1),
        },
        {
            contents: 'Different guild message',
            author_id: '777888999',
            author_global_name: 'OtherDriver',
            guild_id: 'guild_002',
            channel_id: 'channel_003',
            channel_name: 'other-chat',
            created_at: hoursAgo(2),
        },
    ];
}
