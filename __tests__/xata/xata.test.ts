// @xata.io/client is mapped to __mocks__/@xata.io/client.js via moduleNameMapper
import { getXataClient, XataClient } from '../../src/xata';

describe('xata', () => {
    describe('getXataClient', () => {
        test('returns a defined client instance', () => {
            const client = getXataClient();
            expect(client).toBeDefined();
        });

        test('returns the same instance on subsequent calls (singleton)', () => {
            const client1 = getXataClient();
            const client2 = getXataClient();
            expect(client1).toBe(client2);
        });
    });

    describe('XataClient', () => {
        test('can be instantiated', () => {
            const client = new XataClient();
            expect(client).toBeDefined();
        });
    });
});
