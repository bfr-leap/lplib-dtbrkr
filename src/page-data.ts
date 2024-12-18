import { getHomePageData } from './page-data-util/page-data-home';
import { getStandingsPageData } from './page-data-util/page-data-standings';

export async function getPageData(query: { [name: string]: string }): Promise<any> {
    let startTime = Date.now();
    let ret: any = {};

    switch (query.m) {
        case 'standings':
            ret = await getStandingsPageData(query);
            break;
        default:
            ret = await getHomePageData(query);
    }

    let endTime = Date.now();
    console.log(`${query.m} - ${endTime - startTime}`);
    return ret;
}





