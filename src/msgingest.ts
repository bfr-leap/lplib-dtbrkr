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
                AND created_at >= datetime('now', '-6 months')
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

export async function upsertDiscordUserMapping(mapping: {
    user_id: string;
    display_name: string;
    username: string;
    guild_id: string;
}): Promise<void> {
    await sql`
        INSERT INTO discord_user_mappings (user_id, display_name, username, guild_id, updated_at)
        VALUES (${mapping.user_id}, ${mapping.display_name}, ${mapping.username}, ${mapping.guild_id}, datetime('now'))
        ON CONFLICT(user_id, guild_id) DO UPDATE SET
            display_name = ${mapping.display_name},
            username = ${mapping.username},
            updated_at = datetime('now')`;
}

export async function loadDiscordUserMappings(
    guild_id: string
): Promise<{ user_id: string; display_name: string; username: string }[]> {
    const { records } = await sql`
        SELECT user_id, display_name, username
        FROM discord_user_mappings
        WHERE guild_id = ${guild_id}`;
    return records as { user_id: string; display_name: string; username: string }[];
}

/**
 * Returns the `guild_id` that owns the given Discord channel, derived by
 * inspecting the tracktalk message ingest. Returns `null` when no message
 * has ever been ingested for that channel (so callers can decide whether
 * to log + skip vs. raise).
 *
 * This is a pragmatic lookup against ingested messages — there is no
 * dedicated `discord_channels` table — so a channel with zero ingested
 * messages will return `null` even if it exists in Discord.
 */
export async function getGuildIdForChannel(
    channelId: string
): Promise<string | null> {
    console.log('::: getGuildIdForChannel():', channelId);
    const { records } = await sql`
        SELECT guild_id
        FROM tracktalk_raw_message_ingest
        WHERE channel_id = ${channelId}
        LIMIT 1`;

    const rec = records[0] as any;
    if (!rec || rec.guild_id == null) return null;
    return String(rec.guild_id);
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
