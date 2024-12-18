import { getPageData } from '../../src/page-data';
import { PAGE_DATA_STANDINGS, PAGE_DATA_HOME } from './static-page-data';

describe('page-data', () => {
    test('Retrieve the home page data', async () => {
        let page = await getPageData({ m: 'home', league: '4534' });
        expect(page).toEqual(PAGE_DATA_HOME);
    }, 6000);

    test('Retrieve the standings page data', async () => {
        let page = await getPageData({ m: 'standings', league: '4534' });
        expect(page).toEqual(PAGE_DATA_STANDINGS);
    }, 6000);
});