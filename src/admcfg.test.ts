import { adminConfigHandler } from './admcfg';
import { getDb } from './db';

const ADMIN_USER = 'user_2iLpmemWDB0Q0lnePYRHo95hp4W'; // has league_cdr_admin feature
const NON_ADMIN_USER = 'user_unlisted'; // does not have league_cdr_admin feature
// Use an inactive season so inserted events don't pollute getActiveLeagueSchedule queries
const VALID_SEASON = '98603';
const VALID_TRACK = '349';
const FUTURE_TIME = String(new Date('2099-01-01T00:00:00Z').getTime());

describe('adminConfigHandler', () => {
    describe('crtSchedEvent', () => {
        let createdEventId: number | undefined;

        afterEach(() => {
            if (createdEventId !== undefined) {
                getDb().prepare(`DELETE FROM sched_subsessions WHERE id = ?`).run(createdEventId);
                createdEventId = undefined;
            }
        });

        test('creates a schedule event when user has admin feature', async () => {
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'crtSchedEvent',
                userID: ADMIN_USER,
                season: VALID_SEASON,
                time: FUTURE_TIME,
                track: VALID_TRACK,
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.track_id).toBe(Number(VALID_TRACK));
            expect(result.season_id).toBe(Number(VALID_SEASON));
            expect(result.display_name).toBe('NA');

            createdEventId = result.id;
        });

        test('returns undefined when user lacks admin feature', async () => {
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'crtSchedEvent',
                userID: NON_ADMIN_USER,
                season: VALID_SEASON,
                time: FUTURE_TIME,
                track: VALID_TRACK,
            });

            expect(result).toBeUndefined();
        });

        test('returns empty object when inputs are invalid', async () => {
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'crtSchedEvent',
                userID: ADMIN_USER,
                season: VALID_SEASON,
                time: 'not-a-number',
                track: VALID_TRACK,
            });

            expect(result).toEqual({});
        });
    });

    describe('updSchedEvent', () => {
        let eventId: number;

        beforeEach(async () => {
            // Create an event to update
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'crtSchedEvent',
                userID: ADMIN_USER,
                season: VALID_SEASON,
                time: FUTURE_TIME,
                track: VALID_TRACK,
            });
            eventId = result.id;
        });

        afterEach(() => {
            getDb().prepare(`DELETE FROM sched_subsessions WHERE id = ?`).run(eventId);
        });

        test('updates an existing schedule event', async () => {
            const newTime = String(new Date('2099-06-01T00:00:00Z').getTime());
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'updSchedEvent',
                userID: ADMIN_USER,
                event: String(eventId),
                time: newTime,
                track: '168',
            });

            expect(result).toEqual({});

            // Verify the update took effect
            const db = getDb();
            const row = db.prepare(`SELECT track_id FROM sched_subsessions WHERE id = ?`).get(eventId) as any;
            expect(row.track_id).toBe(168);
        });

        test('returns empty object when inputs are invalid', async () => {
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'updSchedEvent',
                userID: ADMIN_USER,
                event: String(eventId),
                time: 'invalid',
                track: VALID_TRACK,
            });

            expect(result).toEqual({});
        });
    });

    describe('delSchedEvent', () => {
        let eventId: number;

        beforeEach(async () => {
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'crtSchedEvent',
                userID: ADMIN_USER,
                season: VALID_SEASON,
                time: FUTURE_TIME,
                track: VALID_TRACK,
            });
            eventId = result.id;
        });

        test('deletes an existing schedule event', async () => {
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'delSchedEvent',
                userID: ADMIN_USER,
                event: String(eventId),
            });

            expect(result).toEqual({});

            // Verify the event was deleted
            const db = getDb();
            const row = db.prepare(`SELECT id FROM sched_subsessions WHERE id = ?`).get(eventId);
            expect(row).toBeUndefined();
        });
    });

    describe('unknown type', () => {
        test('returns null for unknown query type', async () => {
            const result = await adminConfigHandler('ldata-admcfg', {
                type: 'unknownType',
                userID: ADMIN_USER,
            });

            expect(result).toBeNull();
        });
    });
});
