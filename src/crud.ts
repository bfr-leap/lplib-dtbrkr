import { getDb, sql } from './db';
import { notifyDbWrite, type DbUpdateType } from './db-kafka-notify';
import { featureMiddleware as fmw } from './feature-middleware';

// ---------------------------------------------------------------------------
// Table registry
// ---------------------------------------------------------------------------
//
// The CRUD layer is generic and schema-driven, but every table that should be
// reachable through it must be listed here. Adding a new table to `db.ts` does
// NOT automatically expose it; you must also add an entry below. This is
// intentional — the registry is both the allowlist (defense against arbitrary
// table access via the `table` parameter) and the place where Kafka
// notification metadata lives.
//
// `kafkaNamespace` / `kafkaEntity` mirror the conventions already used by
// hand-written modules (admcfg.ts, usrdata.ts, msgingest.ts, stward.ts,
// publications.ts). Keep them consistent so downstream consumers continue to
// receive notifications under the same dataset_id.

export interface TableConfig {
    kafkaNamespace: string;
    kafkaEntity: string;
}

export const TABLE_REGISTRY: { [table: string]: TableConfig } = {
    user_ir_cust_mappings: {
        kafkaNamespace: 'db-user-cfg',
        kafkaEntity: 'irCustMapping',
    },
    leagues: { kafkaNamespace: 'db-league-cfg', kafkaEntity: 'leagues' },
    users_leagues_interest: {
        kafkaNamespace: 'db-user-cfg',
        kafkaEntity: 'leaguesInterest',
    },
    journalists: {
        kafkaNamespace: 'db-league-cfg',
        kafkaEntity: 'journalists',
    },
    journalists_leagues: {
        kafkaNamespace: 'db-league-cfg',
        kafkaEntity: 'journalistsLeagues',
    },
    seasons: { kafkaNamespace: 'db-league-cfg', kafkaEntity: 'seasons' },
    sched_subsessions: {
        kafkaNamespace: 'db-league-cfg',
        kafkaEntity: 'schedSubsessions',
    },
    tracks: { kafkaNamespace: 'db-league-cfg', kafkaEntity: 'tracks' },
    teams: { kafkaNamespace: 'db-league-cfg', kafkaEntity: 'teams' },
    teams_users: { kafkaNamespace: 'db-league-cfg', kafkaEntity: 'teamsUsers' },
    app_features: { kafkaNamespace: 'db-user-cfg', kafkaEntity: 'appFeatures' },
    users_app_features: {
        kafkaNamespace: 'db-user-cfg',
        kafkaEntity: 'usersAppFeatures',
    },
    tracktalk_raw_message_ingest: {
        kafkaNamespace: 'db-msgingest',
        kafkaEntity: 'rawMessageIngest',
    },
    tracktalk_subscriptions: {
        kafkaNamespace: 'db-tracktalk',
        kafkaEntity: 'subscriptions',
    },
    tracktalk_publications: {
        kafkaNamespace: 'db-tracktalk',
        kafkaEntity: 'publication',
    },
    tracktalk_dotd_publications: {
        kafkaNamespace: 'db-tracktalk',
        kafkaEntity: 'dotdPublication',
    },
    discord_user_mappings: {
        kafkaNamespace: 'db-user-cfg',
        kafkaEntity: 'discordIdentity',
    },
    steward_config: {
        kafkaNamespace: 'db-steward',
        kafkaEntity: 'stewardConfig',
    },
};

const REQUIRED_FEATURE = 'global_admin';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

// ---------------------------------------------------------------------------
// Schema introspection
// ---------------------------------------------------------------------------

export interface ColumnInfo {
    name: string;
    type: string;
    notnull: boolean;
    pk: number; // 0 if not a pk column; otherwise 1-based pk position
    dflt_value: any;
}

export interface TableSchema {
    table: string;
    columns: ColumnInfo[];
    pkColumns: string[];
}

const schemaCache: { [table: string]: TableSchema } = {};

function getTableSchema(table: string): TableSchema {
    if (schemaCache[table]) return schemaCache[table];

    assertRegisteredTable(table);
    const db = getDb();
    const rows = db.prepare(`PRAGMA table_info("${table}")`).all() as any[];
    if (rows.length === 0) {
        throw new Error(
            `crud: table "${table}" has no columns (missing from schema?)`
        );
    }

    const columns: ColumnInfo[] = rows.map((r) => ({
        name: String(r.name),
        type: String(r.type),
        notnull: Number(r.notnull) === 1,
        pk: Number(r.pk),
        dflt_value: r.dflt_value,
    }));

    const pkColumns = columns
        .filter((c) => c.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((c) => c.name);

    const schema: TableSchema = { table, columns, pkColumns };
    schemaCache[table] = schema;
    return schema;
}

// ---------------------------------------------------------------------------
// Validation / identifier safety
// ---------------------------------------------------------------------------
//
// Identifiers (table & column names) cannot be parameterized in SQL. We
// only ever embed identifiers that we have already validated against the
// registry / introspected schema, so injection via `table` / column names
// is not possible. Values themselves always go through the parameterized
// `sql` tag.

function assertRegisteredTable(table: string): void {
    if (!Object.prototype.hasOwnProperty.call(TABLE_REGISTRY, table)) {
        throw new Error(`crud: table "${table}" is not registered`);
    }
}

function quoteIdent(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
}

function assertColumns(schema: TableSchema, names: string[]): void {
    const known = new Set(schema.columns.map((c) => c.name));
    for (const n of names) {
        if (!known.has(n)) {
            throw new Error(
                `crud: unknown column "${n}" on table "${schema.table}"`
            );
        }
    }
}

function clampPageSize(n: any): number {
    const v = Number.parseInt(String(n), 10);
    if (!Number.isFinite(v) || v <= 0) return DEFAULT_PAGE_SIZE;
    return Math.min(v, MAX_PAGE_SIZE);
}

function clampOffset(n: any): number {
    const v = Number.parseInt(String(n), 10);
    if (!Number.isFinite(v) || v < 0) return 0;
    return v;
}

function normalizeOrderDir(dir: any): 'ASC' | 'DESC' {
    return String(dir ?? '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
}

// ---------------------------------------------------------------------------
// Notification key extraction
// ---------------------------------------------------------------------------
//
// We notify with whatever values the table's primary key carries. That keeps
// the notification stream consistent with hand-written modules that already
// publish under (e.g.) `irCustMapping/<user_id>` or `stewardConfig/<league_id>`.

function notifyKeys(
    schema: TableSchema,
    row: { [c: string]: any }
): (string | number)[] {
    const keys: (string | number)[] = [];
    for (const col of schema.pkColumns) {
        const v = row[col];
        if (v == null) continue;
        keys.push(typeof v === 'number' ? v : String(v));
    }
    return keys;
}

function notify(
    table: string,
    row: { [c: string]: any },
    type: DbUpdateType
): void {
    const cfg = TABLE_REGISTRY[table];
    const schema = getTableSchema(table);
    const keys = notifyKeys(schema, row);
    if (keys.length === 0) return;
    notifyDbWrite(cfg.kafkaNamespace, cfg.kafkaEntity, keys, type);
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export interface ListResult {
    table: string;
    rows: any[];
    total: number;
    pageSize: number;
    offset: number;
}

export interface ListParams {
    table: string;
    pageSize?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
    where?: { [col: string]: any };
}

export async function listRows(params: ListParams): Promise<ListResult> {
    const schema = getTableSchema(params.table);

    const pageSize = clampPageSize(params.pageSize);
    const offset = clampOffset(params.offset);

    const orderBy =
        params.orderBy ?? schema.pkColumns[0] ?? schema.columns[0].name;
    assertColumns(schema, [orderBy]);
    const orderDir = normalizeOrderDir(params.orderDir);

    const whereCols = params.where ? Object.keys(params.where) : [];
    assertColumns(schema, whereCols);

    const whereClause =
        whereCols.length > 0
            ? 'WHERE ' +
              whereCols.map((c) => `${quoteIdent(c)} = ?`).join(' AND ')
            : '';
    const whereParams = whereCols.map((c) => params.where![c]);

    const tableIdent = quoteIdent(schema.table);

    const countStmt = {
        statement: `SELECT COUNT(*) AS n FROM ${tableIdent} ${whereClause}`,
    };
    const { records: countRecs } = await sql(countStmt, whereParams);
    const total = Number((countRecs[0] as any)?.n ?? 0);

    const listStmt = {
        statement:
            `SELECT * FROM ${tableIdent} ${whereClause} ` +
            `ORDER BY ${quoteIdent(orderBy)} ${orderDir} ` +
            `LIMIT ? OFFSET ?`,
    };
    const { records } = await sql(listStmt, [...whereParams, pageSize, offset]);

    return {
        table: schema.table,
        rows: records,
        total,
        pageSize,
        offset,
    };
}

export async function getRow(
    table: string,
    key: { [c: string]: any }
): Promise<any | null> {
    const schema = getTableSchema(table);
    if (schema.pkColumns.length === 0) {
        throw new Error(`crud: table "${table}" has no primary key`);
    }
    const cols = schema.pkColumns;
    assertColumns(schema, cols);
    const where = cols.map((c) => `${quoteIdent(c)} = ?`).join(' AND ');
    const params = cols.map((c) => {
        if (key[c] === undefined) {
            throw new Error(
                `crud: missing key column "${c}" for table "${table}"`
            );
        }
        return key[c];
    });
    const stmt = {
        statement: `SELECT * FROM ${quoteIdent(
            schema.table
        )} WHERE ${where} LIMIT 1`,
    };
    const { records } = await sql(stmt, params);
    return records[0] ?? null;
}

export async function createRow(
    table: string,
    values: { [c: string]: any }
): Promise<any> {
    const schema = getTableSchema(table);
    const cols = Object.keys(values);
    if (cols.length === 0) {
        throw new Error(`crud: createRow requires at least one column value`);
    }
    assertColumns(schema, cols);

    const colList = cols.map(quoteIdent).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const params = cols.map((c) => values[c]);

    const db = getDb();
    const stmt = db.prepare(
        `INSERT INTO ${quoteIdent(
            schema.table
        )} (${colList}) VALUES (${placeholders})`
    );
    const result = stmt.run(...params);

    // Re-read the inserted row so we can return a complete representation
    // and emit a notification keyed on the actual primary-key values.
    let inserted: any = null;
    if (
        schema.pkColumns.length === 1 &&
        schema.columns
            .find((c) => c.name === schema.pkColumns[0])
            ?.type?.toUpperCase()
            .includes('INTEGER')
    ) {
        const pk = schema.pkColumns[0];
        inserted = await getRow(table, { [pk]: result.lastInsertRowid });
    } else {
        const keyObj: { [c: string]: any } = {};
        for (const c of schema.pkColumns) keyObj[c] = values[c];
        if (Object.values(keyObj).every((v) => v !== undefined)) {
            inserted = await getRow(table, keyObj);
        }
    }

    if (inserted) notify(table, inserted, 'insert');
    return inserted ?? { ...values, lastInsertRowid: result.lastInsertRowid };
}

export async function updateRow(
    table: string,
    key: { [c: string]: any },
    values: { [c: string]: any }
): Promise<any | null> {
    const schema = getTableSchema(table);
    if (schema.pkColumns.length === 0) {
        throw new Error(`crud: table "${table}" has no primary key`);
    }
    const setCols = Object.keys(values).filter(
        (c) => !schema.pkColumns.includes(c)
    );
    if (setCols.length === 0) {
        throw new Error(
            `crud: updateRow requires at least one non-pk column value`
        );
    }
    assertColumns(schema, setCols);
    assertColumns(schema, schema.pkColumns);

    const setClause = setCols.map((c) => `${quoteIdent(c)} = ?`).join(', ');
    const whereClause = schema.pkColumns
        .map((c) => `${quoteIdent(c)} = ?`)
        .join(' AND ');

    const setParams = setCols.map((c) => values[c]);
    const whereParams = schema.pkColumns.map((c) => {
        if (key[c] === undefined) {
            throw new Error(
                `crud: missing key column "${c}" for table "${table}"`
            );
        }
        return key[c];
    });

    const stmt = {
        statement: `UPDATE ${quoteIdent(
            schema.table
        )} SET ${setClause} WHERE ${whereClause}`,
    };
    await sql(stmt, [...setParams, ...whereParams]);

    const updated = await getRow(table, key);
    if (updated) notify(table, updated, 'update');
    return updated;
}

export async function deleteRow(
    table: string,
    key: { [c: string]: any }
): Promise<boolean> {
    const schema = getTableSchema(table);
    if (schema.pkColumns.length === 0) {
        throw new Error(`crud: table "${table}" has no primary key`);
    }
    const existing = await getRow(table, key);
    if (!existing) return false;

    const whereClause = schema.pkColumns
        .map((c) => `${quoteIdent(c)} = ?`)
        .join(' AND ');
    const params = schema.pkColumns.map((c) => key[c]);
    const stmt = {
        statement: `DELETE FROM ${quoteIdent(
            schema.table
        )} WHERE ${whereClause}`,
    };
    await sql(stmt, params);

    notify(table, existing, 'delete');
    return true;
}

export function listTables(): {
    table: string;
    kafkaNamespace: string;
    kafkaEntity: string;
}[] {
    return Object.keys(TABLE_REGISTRY)
        .sort()
        .map((t) => ({ table: t, ...TABLE_REGISTRY[t] }));
}

export function describeTable(table: string): TableSchema {
    return getTableSchema(table);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
//
// Single entry point gated by the `global_admin` feature flag. Any user who
// does not have that flag receives `undefined` (the same behaviour as
// `featureMiddleware`-protected routes elsewhere in the codebase).
//
// Query shape:
//   { type: 'crud:list',   userID, table, pageSize?, offset?, orderBy?, orderDir?, where? }
//   { type: 'crud:get',    userID, table, key }
//   { type: 'crud:create', userID, table, values }
//   { type: 'crud:update', userID, table, key, values }
//   { type: 'crud:delete', userID, table, key }
//   { type: 'crud:tables', userID }
//   { type: 'crud:schema', userID, table }

export async function crudHandler(namespace: string, query: any): Promise<any> {
    const q = query ?? {};
    console.log(':: crudHandler():', q?.type, q?.userID, q?.table);

    return await fmw([REQUIRED_FEATURE], q?.userID, async () => {
        try {
            switch (q?.type) {
                case 'crud:tables':
                    return { tables: listTables() };
                case 'crud:schema':
                    return describeTable(q?.table);
                case 'crud:list':
                    return await listRows({
                        table: q?.table,
                        pageSize: q?.pageSize,
                        offset: q?.offset,
                        orderBy: q?.orderBy,
                        orderDir: q?.orderDir,
                        where: q?.where,
                    });
                case 'crud:get':
                    return await getRow(q?.table, q?.key ?? {});
                case 'crud:create':
                    return await createRow(q?.table, q?.values ?? {});
                case 'crud:update':
                    return await updateRow(
                        q?.table,
                        q?.key ?? {},
                        q?.values ?? {}
                    );
                case 'crud:delete':
                    return { deleted: await deleteRow(q?.table, q?.key ?? {}) };
                default:
                    return { error: `unknown crud type: ${q?.type}` };
            }
        } catch (e: any) {
            console.log(':: crudHandler() error:', e?.message ?? e);
            return { error: String(e?.message ?? e) };
        }
    });
}
