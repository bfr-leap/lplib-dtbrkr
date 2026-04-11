import { TracktalkRawMessage } from 'ir-endpoint-types';
import { sql } from './db';

export async function createRawMessageIngest(msg: {
    contents: string;
    author_id: string;
    author_username: string;
    author_global_name: string;
    guild_id: string;
    channel_id: string;
    channel_name: string;
}): Promise<void> {
    await sql`
        INSERT INTO tracktalk_raw_message_ingest
        (contents, author_id, author_username, author_global_name, guild_id, channel_id, channel_name)
        VALUES (${msg.contents}, ${msg.author_id}, ${msg.author_username},
                ${msg.author_global_name}, ${msg.guild_id}, ${msg.channel_id}, ${msg.channel_name})`;
}

export async function loadUserIdsForChannel(
    channel: string
): Promise<{ [name: string]: string }> {
    try {
        const { records } = await sql`
            SELECT author_global_name, author_id
            FROM (
                SELECT
                    author_global_name,
                    author_id,
                    ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) AS rn
                FROM tracktalk_raw_message_ingest
                WHERE guild_id = (
                    SELECT guild_id
                    FROM tracktalk_raw_message_ingest
                    WHERE channel_id = ${channel}
                    LIMIT 1
                )
                AND created_at >= datetime('now', '-7 days')
            ) sub
            WHERE rn = 1`;

        const rMap: { [name: string]: string } = {};
        for (const rec of records as { author_global_name: string; author_id: string }[]) {
            const cleaned = rec.author_global_name.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ' .-]/g, '').replace(/\s+/g, ' ').trim();
            rMap[cleaned] = `<@${rec.author_id}>`;
        }
        return rMap;
    } catch (e) {
        console.log(e);
        return {};
    }
}

export async function deleteAllRawMessageIngest(): Promise<void> {
    await sql`DELETE FROM tracktalk_raw_message_ingest WHERE 1=1`;
}

export async function getTracktalkMessagesForChannel(
    channelId: string
): Promise<TracktalkRawMessage[]> {
    console.log('::: getTracktalkMessagesForChannel():', channelId);
    const { records } = await sql`
        SELECT id, contents, author_id, author_username, author_global_name,
               guild_id, channel_id, channel_name, created_at
        FROM tracktalk_raw_message_ingest
        WHERE channel_id = ${channelId}
        ORDER BY created_at ASC, id ASC`;

    return (records as any[]).map((rec) => ({
        id: Number(rec.id),
        contents: String(rec.contents ?? ''),
        author_id: String(rec.author_id ?? ''),
        author_username: String(rec.author_username ?? ''),
        author_global_name: String(rec.author_global_name ?? ''),
        guild_id: String(rec.guild_id ?? ''),
        channel_id: String(rec.channel_id ?? ''),
        channel_name: String(rec.channel_name ?? ''),
        created_at: String(rec.created_at ?? ''),
    }));
}
