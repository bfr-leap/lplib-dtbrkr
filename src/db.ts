import Database from 'better-sqlite3';
import * as path from 'path';

let dbInstance: Database.Database | undefined;

export function getDb(): Database.Database {
    if (dbInstance) return dbInstance;
    const dbPath =
        process.env.DB_PATH ||
        path.join(process.cwd(), 'bfr-leapdb.sqlite');
    dbInstance = new Database(dbPath);
    initSchema(dbInstance);
    return dbInstance;
}

export function resetDb(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = undefined;
    }
}

function initSchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_ir_cust_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE,
            ir_cust_id TEXT,
            verify_code INTEGER,
            is_verified INTEGER NOT NULL DEFAULT 0,
            msg_sent INTEGER NOT NULL DEFAULT 0,
            try_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS leagues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            league_id INTEGER UNIQUE,
            name TEXT,
            short_name TEXT
        );

        CREATE TABLE IF NOT EXISTS users_leagues_interest (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            league_id INTEGER,
            user_id TEXT
        );

        CREATE TABLE IF NOT EXISTS journalists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            style_name TEXT,
            display_name TEXT,
            fine_tuning_prompt TEXT
        );

        CREATE TABLE IF NOT EXISTS journalists_leagues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journalist_id INTEGER,
            league_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS seasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            season_id INTEGER,
            league_id INTEGER,
            display_name TEXT,
            car_id INTEGER,
            is_active INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sched_subsessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            season_id INTEGER,
            time TEXT,
            track_id INTEGER,
            display_name TEXT
        );

        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name TEXT,
            short_name TEXT,
            track_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name TEXT,
            season_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS teams_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ir_cust_id INTEGER,
            team_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS app_features (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name TEXT,
            release_to_all INTEGER NOT NULL DEFAULT 0,
            release_to_some INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS users_app_features (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            feature_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS tracktalk_raw_message_ingest (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contents TEXT,
            author_id TEXT,
            author_username TEXT,
            author_global_name TEXT,
            guild_id TEXT,
            channel_id TEXT,
            channel_name TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tracktalk_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT,
            league_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS tracktalk_publications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT,
            subsession_id INTEGER
        );
    `);
}

type SqlResult = { records: any[] };

function prepareValue(v: any): any {
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
}

function executeStatement(query: string, params: any[]): SqlResult {
    const db = getDb();
    const trimmed = query.trim().toUpperCase();
    try {
        const stmt = db.prepare(query);
        if (trimmed.startsWith('SELECT')) {
            const records = stmt.all(...params);
            return { records };
        } else {
            stmt.run(...params);
            return { records: [] };
        }
    } catch (e) {
        console.error('SQLite error:', e);
        console.error('Query:', query);
        console.error('Params:', params);
        throw e;
    }
}

export function executeInsert(query: string, params: any[]): number {
    const db = getDb();
    try {
        const stmt = db.prepare(query);
        const result = stmt.run(...params);
        return result.lastInsertRowid as number;
    } catch (e) {
        console.error('SQLite insert error:', e);
        console.error('Query:', query);
        console.error('Params:', params);
        throw e;
    }
}

// sql tagged template - also supports ({ statement: string }, params[]) form
export function sql(
    stringsOrStmt: TemplateStringsArray | { statement: string },
    ...rest: any[]
): Promise<SqlResult> {
    if (!Array.isArray(stringsOrStmt)) {
        const stmt = (stringsOrStmt as { statement: string }).statement;
        const params = Array.isArray(rest[0]) ? rest[0] : rest;
        return Promise.resolve(executeStatement(stmt, params));
    }

    const strings = stringsOrStmt as TemplateStringsArray;
    let query = '';
    const params: any[] = [];
    for (let i = 0; i < strings.length; i++) {
        query += strings[i];
        if (i < rest.length) {
            query += '?';
            params.push(prepareValue(rest[i]));
        }
    }
    return Promise.resolve(executeStatement(query, params));
}

export function getSqliteClient() {
    return { sql };
}
