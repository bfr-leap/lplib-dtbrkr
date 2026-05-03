import {
    crudHandler,
    listRows,
    createRow,
    updateRow,
    deleteRow,
    describeTable,
    listTables,
    TABLE_REGISTRY,
} from './crud';
import { getDb } from './db';

const ADMIN_USER = 'user_2iLpmemWDB0Q0lnePYRHo95hp4W'; // has global_admin
const NON_ADMIN_USER = 'user_unlisted';

describe('crud', () => {
    describe('registry & schema', () => {
        test('registry covers every table defined in db.ts', () => {
            const db = getDb();
            const tables = (
                db
                    .prepare(
                        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
                    )
                    .all() as { name: string }[]
            ).map((r) => r.name);

            for (const t of tables) {
                expect(TABLE_REGISTRY[t]).toBeDefined();
            }
        });

        test('describeTable returns columns and pk info', () => {
            const schema = describeTable('seasons');
            expect(schema.table).toBe('seasons');
            expect(schema.pkColumns).toEqual(['id']);
            const colNames = schema.columns.map((c) => c.name).sort();
            expect(colNames).toEqual(
                [
                    'car_id',
                    'display_name',
                    'id',
                    'is_active',
                    'league_id',
                    'season_id',
                ].sort()
            );
        });

        test('describeTable surfaces composite primary keys', () => {
            const schema = describeTable('discord_user_mappings');
            expect(schema.pkColumns.sort()).toEqual(['guild_id', 'user_id']);
        });

        test('listTables returns sorted registered tables with kafka metadata', () => {
            const out = listTables();
            expect(out.length).toBe(Object.keys(TABLE_REGISTRY).length);
            const names = out.map((r) => r.table);
            expect(names).toEqual([...names].sort());
            const seasons = out.find((r) => r.table === 'seasons')!;
            expect(seasons.kafkaNamespace).toBe('db-league-cfg');
            expect(seasons.kafkaEntity).toBe('seasons');
        });
    });

    describe('listRows (paged)', () => {
        const created: number[] = [];

        beforeAll(async () => {
            // Seed 25 rows in `tracks`
            for (let i = 0; i < 25; i++) {
                const row = await createRow('tracks', {
                    track_id: 900000 + i,
                    display_name: `crud_test_track_${String(i).padStart(
                        2,
                        '0'
                    )}`,
                    short_name: `ctt${i}`,
                });
                created.push(row.id);
            }
        });

        afterAll(() => {
            const db = getDb();
            for (const id of created) {
                db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
            }
        });

        test('returns first page with default page size', async () => {
            const result = await listRows({
                table: 'tracks',
                where: { short_name: 'ctt0' },
            });
            expect(result.table).toBe('tracks');
            expect(result.rows.length).toBe(1);
            expect(result.total).toBe(1);
            expect(result.pageSize).toBe(50);
            expect(result.offset).toBe(0);
        });

        test('respects pageSize and offset', async () => {
            const page1 = await listRows({
                table: 'tracks',
                pageSize: 10,
                offset: 0,
                orderBy: 'track_id',
                orderDir: 'ASC',
                where: {},
            });
            const page2 = await listRows({
                table: 'tracks',
                pageSize: 10,
                offset: 10,
                orderBy: 'track_id',
                orderDir: 'ASC',
                where: {},
            });
            expect(page1.rows.length).toBe(10);
            expect(page2.rows.length).toBe(10);
            const ids1 = page1.rows.map((r: any) => r.id);
            const ids2 = page2.rows.map((r: any) => r.id);
            expect(new Set(ids1).size).toBe(10);
            // Pages must not overlap
            for (const id of ids1) expect(ids2).not.toContain(id);
        });

        test('clamps oversized pageSize to MAX_PAGE_SIZE', async () => {
            const result = await listRows({ table: 'tracks', pageSize: 99999 });
            expect(result.pageSize).toBe(500);
        });

        test('rejects unknown column in orderBy', async () => {
            await expect(
                listRows({
                    table: 'tracks',
                    orderBy: 'nope; DROP TABLE tracks --',
                })
            ).rejects.toThrow(/unknown column/);
        });

        test('rejects unregistered table', async () => {
            await expect(
                listRows({ table: 'sqlite_master' as any })
            ).rejects.toThrow(/not registered/);
        });
    });

    describe('CRUD lifecycle via handler', () => {
        let createdId: number | undefined;

        afterEach(() => {
            if (createdId !== undefined) {
                getDb()
                    .prepare('DELETE FROM journalists WHERE id = ?')
                    .run(createdId);
                createdId = undefined;
            }
        });

        test('create -> get -> update -> delete', async () => {
            const created = await crudHandler('crud', {
                type: 'crud:create',
                userID: ADMIN_USER,
                table: 'journalists',
                values: {
                    style_name: 'crud_test',
                    display_name: 'CRUD Tester',
                    fine_tuning_prompt: 'be terse',
                },
            });
            expect(created).toBeDefined();
            expect(created.id).toBeGreaterThan(0);
            expect(created.style_name).toBe('crud_test');
            createdId = created.id;

            const fetched = await crudHandler('crud', {
                type: 'crud:get',
                userID: ADMIN_USER,
                table: 'journalists',
                key: { id: createdId },
            });
            expect(fetched.display_name).toBe('CRUD Tester');

            const updated = await crudHandler('crud', {
                type: 'crud:update',
                userID: ADMIN_USER,
                table: 'journalists',
                key: { id: createdId },
                values: { display_name: 'CRUD Tester v2' },
            });
            expect(updated.display_name).toBe('CRUD Tester v2');
            // Untouched fields preserved
            expect(updated.style_name).toBe('crud_test');

            const deleted = await crudHandler('crud', {
                type: 'crud:delete',
                userID: ADMIN_USER,
                table: 'journalists',
                key: { id: createdId },
            });
            expect(deleted).toEqual({ deleted: true });

            const gone = await crudHandler('crud', {
                type: 'crud:get',
                userID: ADMIN_USER,
                table: 'journalists',
                key: { id: createdId },
            });
            expect(gone).toBeNull();

            createdId = undefined;
        });

        test('delete returns {deleted:false} for missing rows', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:delete',
                userID: ADMIN_USER,
                table: 'journalists',
                key: { id: -999999 },
            });
            expect(result).toEqual({ deleted: false });
        });
    });

    describe('composite-pk table', () => {
        const guildId = 'crud-test-guild';
        const userId = 'crud-test-user';

        afterEach(() => {
            getDb()
                .prepare(
                    'DELETE FROM discord_user_mappings WHERE user_id = ? AND guild_id = ?'
                )
                .run(userId, guildId);
        });

        test('create + get by composite key', async () => {
            const created = await createRow('discord_user_mappings', {
                user_id: userId,
                guild_id: guildId,
                display_name: 'Crud Tester',
                username: 'crudtester',
            });
            expect(created.user_id).toBe(userId);
            expect(created.guild_id).toBe(guildId);

            const updated = await updateRow(
                'discord_user_mappings',
                { user_id: userId, guild_id: guildId },
                { display_name: 'Crud Tester v2' }
            );
            expect(updated.display_name).toBe('Crud Tester v2');

            const ok = await deleteRow('discord_user_mappings', {
                user_id: userId,
                guild_id: guildId,
            });
            expect(ok).toBe(true);
        });
    });

    describe('auth gating', () => {
        test('non-admin cannot list', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:list',
                userID: NON_ADMIN_USER,
                table: 'tracks',
            });
            expect(result).toBeUndefined();
        });

        test('non-admin cannot create', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:create',
                userID: NON_ADMIN_USER,
                table: 'journalists',
                values: { display_name: 'should not exist' },
            });
            expect(result).toBeUndefined();
            const rows = getDb()
                .prepare(
                    `SELECT id FROM journalists WHERE display_name = 'should not exist'`
                )
                .all();
            expect(rows.length).toBe(0);
        });

        test('admin can list', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:list',
                userID: ADMIN_USER,
                table: 'tracks',
                pageSize: 1,
            });
            expect(result).toBeDefined();
            expect(result.table).toBe('tracks');
            expect(Array.isArray(result.rows)).toBe(true);
        });

        test('admin can list tables', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:tables',
                userID: ADMIN_USER,
            });
            expect(result.tables.length).toBe(
                Object.keys(TABLE_REGISTRY).length
            );
        });

        test('admin can describe a table schema', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:schema',
                userID: ADMIN_USER,
                table: 'seasons',
            });
            expect(result.table).toBe('seasons');
            expect(result.pkColumns).toEqual(['id']);
        });
    });

    describe('error surface', () => {
        test('returns {error} for unknown type', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:nonsense',
                userID: ADMIN_USER,
            });
            expect(result.error).toMatch(/unknown crud type/);
        });

        test('returns {error} for unregistered table', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:list',
                userID: ADMIN_USER,
                table: 'sqlite_master',
            });
            expect(result.error).toMatch(/not registered/);
        });

        test('returns {error} for unknown column in where', async () => {
            const result = await crudHandler('crud', {
                type: 'crud:list',
                userID: ADMIN_USER,
                table: 'tracks',
                where: { not_a_real_col: 'x' },
            });
            expect(result.error).toMatch(/unknown column/);
        });
    });
});
