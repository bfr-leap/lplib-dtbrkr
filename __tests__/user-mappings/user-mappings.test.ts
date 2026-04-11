import { getIrCustIdForDiscordUser } from '../../src/user-mappings';
import { sql } from '../../src/db';

describe('user-mappings - getIrCustIdForDiscordUser', () => {
    const testUserIds = [
        'uim-verified',
        'uim-unverified',
        'uim-missing',
    ];

    afterEach(async () => {
        for (const uid of testUserIds) {
            await sql`DELETE FROM user_ir_cust_mappings WHERE user_id = ${uid}`;
        }
    });

    test('returns null when no mapping exists for the user', async () => {
        const result = await getIrCustIdForDiscordUser('uim-missing');
        expect(result).toBeNull();
    });

    test('returns the cust_id when the mapping is verified', async () => {
        await sql`
            INSERT INTO user_ir_cust_mappings (user_id, ir_cust_id, verify_code, is_verified)
            VALUES (${'uim-verified'}, ${'123456'}, ${0}, ${1})`;

        const result = await getIrCustIdForDiscordUser('uim-verified');
        expect(result).toBe('123456');
    });

    test('returns null when the mapping exists but is not verified', async () => {
        await sql`
            INSERT INTO user_ir_cust_mappings (user_id, ir_cust_id, verify_code, is_verified)
            VALUES (${'uim-unverified'}, ${'654321'}, ${9999}, ${0})`;

        const result = await getIrCustIdForDiscordUser('uim-unverified');
        expect(result).toBeNull();
    });
});
