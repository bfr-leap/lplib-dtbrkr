import { sql } from './db';

/**
 * Returns the verified iRacing cust_id for the given Discord user, or `null`
 * when no verified mapping exists.
 *
 * IMPORTANT: This function filters on `is_verified = 1`. Unverified entries
 * are in the middle of the broker's own Discord DM verification flow and
 * must NOT be treated as authoritative — callers that need an authoritative
 * Discord-to-iRacing mapping should only ever see verified records.
 */
export async function getIrCustIdForDiscordUser(
    discordUserId: string
): Promise<string | null> {
    console.log('::: getIrCustIdForDiscordUser():', discordUserId);
    const { records } = await sql`
        SELECT ir_cust_id FROM user_ir_cust_mappings
        WHERE user_id = ${discordUserId} AND is_verified = 1
        LIMIT 1`;

    const rec = records[0] as any;
    if (!rec || rec.ir_cust_id == null) return null;
    return String(rec.ir_cust_id);
}
