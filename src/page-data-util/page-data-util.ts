import { getDocument } from '../ftchdata';

export async function defLgSeasSubCtx(query: { [name: string]: string }): Promise<any> {
    const q = {
        namespace: 'ldata-usrcfg',
        type: `defLgSeasSubCtx`,
        league: query.league,
        season: query.season,
        subsession: query.subsession
    };

    const lgSeasSubCtx = await getDocument(q.namespace, q);

    return lgSeasSubCtx;
}