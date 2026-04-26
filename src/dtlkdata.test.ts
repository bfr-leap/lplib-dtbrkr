import { getDocument } from './dtlkdata';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('dtlkdata', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('getDocument', () => {
        test('constructs the correct URL and returns parsed JSON', async () => {
            const fakeData = { foo: 'bar' };
            mockFetch.mockResolvedValueOnce({
                json: async () => fakeData,
            });

            const result = await getDocument({
                namespace: 'ldata-irweb',
                type: 'leagueSeasonSessions',
                league: 4534,
                season: 105035,
            });

            expect(result).toEqual(fakeData);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('ldata-irweb');
            expect(calledUrl).toContain('leagueSeasonSessions');
            expect(calledUrl).toContain('/4534');
            expect(calledUrl).toContain('/105035');
            expect(calledUrl).toMatch(/\.json$/);
        });

        test('includes subsession, driver, car, track, sessionType, custId in URL when provided', async () => {
            mockFetch.mockResolvedValueOnce({ json: async () => ({}) });

            await getDocument({
                namespace: 'ldata-ns',
                type: 'someType',
                league: 1,
                season: 2,
                subsession: 3,
                driver: 4,
                car: 5,
                track: 6,
                sessionType: 7,
                custId: 8,
            });

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('/1');
            expect(calledUrl).toContain('/2');
            expect(calledUrl).toContain('/3');
            expect(calledUrl).toContain('/4');
            expect(calledUrl).toContain('/5');
            expect(calledUrl).toContain('/6');
            expect(calledUrl).toContain('/7');
            expect(calledUrl).toContain('/8');
        });

        test('converts negative numbers to n-prefix in URL', async () => {
            mockFetch.mockResolvedValueOnce({ json: async () => ({}) });

            await getDocument({
                namespace: 'ns',
                type: 'type',
                simsession: -1,
            });

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('n1');
        });

        test('returns null when fetch throws an error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('network error'));

            const result = await getDocument({ namespace: 'ns', type: 'type' });
            expect(result).toBeNull();
        });

        test('returns null when json parsing fails', async () => {
            mockFetch.mockResolvedValueOnce({
                json: async () => { throw new Error('invalid json'); },
            });

            const result = await getDocument({ namespace: 'ns', type: 'type' });
            expect(result).toBeNull();
        });

        test('omits optional path segments when not provided', async () => {
            mockFetch.mockResolvedValueOnce({ json: async () => ({}) });

            await getDocument({ namespace: 'ldata-ns', type: 'myType' });

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('ldata-ns/myType');
            expect(calledUrl).toMatch(/myType\.json$/);
        });
    });
});
