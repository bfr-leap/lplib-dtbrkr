jest.mock('../../src/usrdata', () => ({
    userDataHandler: jest.fn(async () => ({ type: 'usrdata-result' })),
}));

jest.mock('../../src/usrcfg', () => ({
    userConfigHandler: jest.fn(async () => ({ type: 'usrcfg-result' })),
}));

jest.mock('../../src/admcfg', () => ({
    adminConfigHandler: jest.fn(async () => ({ type: 'admcfg-result' })),
}));

jest.mock('../../src/dtlkdata', () => ({
    getDocument: jest.fn(async () => ({ type: 'dtlkdata-result' })),
}));

import { getDocument } from '../../src/ftchdata';
import { userDataHandler } from '../../src/usrdata';
import { userConfigHandler } from '../../src/usrcfg';
import { adminConfigHandler } from '../../src/admcfg';
import { getDocument as getDataLakeDocument } from '../../src/dtlkdata';

describe('ftchdata', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getDocument', () => {
        test('routes ldata-usrdata namespace to userDataHandler', async () => {
            const query = { type: 'userFeatures', userID: 'user123' };
            const result = await getDocument('ldata-usrdata', query);

            // passthroughMiddleware calls next(namespace, query) — 2 args
            expect(userDataHandler).toHaveBeenCalledWith('ldata-usrdata', query);
            expect(result).toEqual({ type: 'usrdata-result' });
        });

        test('routes ldata-admcfg namespace to adminConfigHandler', async () => {
            const query = { type: 'crtSchedEvent', userID: 'user123' };
            const result = await getDocument('ldata-admcfg', query);

            // passthroughMiddleware calls next(namespace, query) — 2 args
            expect(adminConfigHandler).toHaveBeenCalledWith('ldata-admcfg', query);
            expect(result).toEqual({ type: 'admcfg-result' });
        });

        test('routes ldata-usrcfg namespace to userConfigHandler', async () => {
            const query = { type: 'trackDisplayInfo' };
            const result = await getDocument('ldata-usrcfg', query);

            expect(userConfigHandler).toHaveBeenCalledWith('ldata-usrcfg', query);
            expect(result).toEqual({ type: 'usrcfg-result' });
        });

        test('routes unknown namespace to getDataLakeDocument', async () => {
            const query = { type: 'leagueSeasonSessions', namespace: 'ldata-irweb', league: '4534' };
            const result = await getDocument('ldata-irweb', query);

            expect(getDataLakeDocument).toHaveBeenCalledWith(query);
            expect(result).toEqual({ type: 'dtlkdata-result' });
        });

        test('passes authMiddleware to userDataHandler when provided', async () => {
            const middleware = jest.fn(async (_ns: string, _q: any, next: Function) => next(_ns, _q));
            const query = { type: 'userFeatures', userID: 'user123' };
            await getDocument('ldata-usrdata', query, middleware);

            expect(middleware).toHaveBeenCalled();
        });

        test('passes authMiddleware to adminConfigHandler when provided', async () => {
            const middleware = jest.fn(async (_ns: string, _q: any, next: Function) => next(_ns, _q));
            const query = { type: 'crtSchedEvent', userID: 'user123' };
            await getDocument('ldata-admcfg', query, middleware);

            expect(middleware).toHaveBeenCalled();
        });
    });
});
