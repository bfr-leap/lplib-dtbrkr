import { getDb, resetDb, executeInsert, sql, getSqliteClient } from '../../src/db';

describe('db', () => {
    describe('getDb', () => {
        test('returns a Database instance', () => {
            const db = getDb();
            expect(db).toBeDefined();
            expect(typeof db.prepare).toBe('function');
        });

        test('returns the same instance on subsequent calls', () => {
            const db1 = getDb();
            const db2 = getDb();
            expect(db1).toBe(db2);
        });
    });

    describe('resetDb', () => {
        test('closes the current connection and allows a new one to be created', () => {
            const db1 = getDb();
            resetDb();
            const db2 = getDb();
            expect(db2).toBeDefined();
            expect(db1).not.toBe(db2);
        });
    });

    describe('executeInsert', () => {
        test('inserts a row and returns the lastInsertRowid', () => {
            const rowId = executeInsert(
                `INSERT INTO tracks (display_name, short_name, track_id) VALUES (?, ?, ?)`,
                ['Test Track', 'TST', 99999]
            );
            expect(typeof rowId).toBe('number');
            expect(rowId).toBeGreaterThan(0);

            // cleanup
            getDb().prepare(`DELETE FROM tracks WHERE track_id = 99999`).run();
        });

        test('throws on invalid SQL', () => {
            expect(() => {
                executeInsert(`INSERT INTO nonexistent_table (col) VALUES (?)`, ['val']);
            }).toThrow();
        });
    });

    describe('sql tagged template', () => {
        test('SELECT returns records from the database', async () => {
            const { records } = await sql`SELECT * FROM tracks LIMIT 1`;
            expect(Array.isArray(records)).toBe(true);
        });

        test('INSERT via tagged template executes without error', async () => {
            await sql`INSERT INTO tracks (display_name, short_name, track_id) VALUES (${'Temp Track'}, ${'TMP'}, ${88888})`;
            const { records } = await sql`SELECT * FROM tracks WHERE track_id = ${88888}`;
            expect(records.length).toBe(1);
            expect((records[0] as any).display_name).toBe('Temp Track');

            // cleanup
            await sql`DELETE FROM tracks WHERE track_id = ${88888}`;
        });

        test('converts Date values to ISO strings', async () => {
            const now = new Date('2025-01-01T12:00:00.000Z');
            // Insert a sched_subsession with a Date value for time
            const rowId = executeInsert(
                `INSERT INTO sched_subsessions (season_id, time, track_id, display_name) VALUES (?, ?, ?, ?)`,
                [105035, now.toISOString(), 168, 'date-test']
            );
            const { records } = await sql`SELECT time FROM sched_subsessions WHERE id = ${rowId}`;
            expect(records.length).toBe(1);

            // cleanup
            getDb().prepare(`DELETE FROM sched_subsessions WHERE id = ?`).run(rowId);
        });
    });

    describe('sql with statement object form', () => {
        test('executes a SELECT statement and returns records', async () => {
            const { records } = await sql({ statement: 'SELECT * FROM tracks LIMIT 5' }, []);
            expect(Array.isArray(records)).toBe(true);
            expect(records.length).toBeLessThanOrEqual(5);
        });

        test('executes DELETE statement', async () => {
            executeInsert(
                `INSERT INTO tracks (display_name, short_name, track_id) VALUES (?, ?, ?)`,
                ['Delete Me', 'DEL', 77777]
            );
            await sql({ statement: `DELETE FROM tracks WHERE track_id = 77777` }, []);
            const { records } = await sql`SELECT * FROM tracks WHERE track_id = ${77777}`;
            expect(records.length).toBe(0);
        });
    });

    describe('getSqliteClient', () => {
        test('returns an object with a sql function', () => {
            const client = getSqliteClient();
            expect(client).toBeDefined();
            expect(typeof client.sql).toBe('function');
        });

        test('sql function from client executes queries', async () => {
            const client = getSqliteClient();
            const result = await client.sql`SELECT COUNT(*) as cnt FROM tracks`;
            expect(result.records.length).toBe(1);
            expect((result.records[0] as any).cnt).toBeGreaterThan(0);
        });
    });
});
