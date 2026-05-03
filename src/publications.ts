import { sql } from './db';
import { notifyDbWrite } from './db-kafka-notify';

export async function createPublication(channel_id: string, subsession_id: number): Promise<void> {
    await sql`
        INSERT INTO tracktalk_publications (channel_id, subsession_id)
        VALUES (${channel_id}, ${subsession_id})`;

    notifyDbWrite('db-tracktalk', 'publication', [subsession_id], 'update');
}

export async function isSubsessionPublished(subsession_id: number): Promise<boolean> {
    const { records } = await sql`
        SELECT subsession_id FROM tracktalk_publications
        WHERE subsession_id = ${subsession_id}`;

    return records.length > 0;
}

export async function createDotdPublication(channel_id: string, subsession_id: number, cust_id: number): Promise<void> {
    await sql`
        INSERT INTO tracktalk_dotd_publications (channel_id, subsession_id, cust_id)
        VALUES (${channel_id}, ${subsession_id}, ${cust_id})`;

    notifyDbWrite(
        'db-tracktalk',
        'dotdPublication',
        [subsession_id, cust_id],
        'update'
    );
}

export async function isDotdPublished(subsession_id: number): Promise<boolean> {
    const { records } = await sql`
        SELECT subsession_id FROM tracktalk_dotd_publications
        WHERE subsession_id = ${subsession_id}`;

    return records.length > 0;
}
