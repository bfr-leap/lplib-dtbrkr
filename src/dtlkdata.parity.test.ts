// =============================================================================
// TEMPORARY: data-lake URL ↔ loader parity test
// =============================================================================
//
// Contract: getDocument(query) must return *byte-for-byte identical* data to
// what the legacy GitHub-Pages URL fetch used to return. Downstream callers
// (stward.ts, usrcfg.ts, usrdata.ts, page-data-*.ts, valid-util.ts) are not
// aware the source switched, so any shape or value divergence is a bug —
// even fields the broker doesn't currently read. The assertion is strict
// `toEqual`. There is no "but downstream doesn't use that field" exception.
//
// Skipped by default so `npm test` in CI stays green. Opt in with:
//
//     RUN_DATALAKE_PARITY=1 npm test -- src/dtlkdata.parity.test.ts
//
// Requirements when running:
//   - Network access to https://arturo-mayorga.github.io/irl_stats/
//   - Local ./public/data/ tree populated for the namespaces under test.
//     If it's empty, every case will pass trivially (null === null) but
//     each will emit a "BOTH NULL — INCONCLUSIVE" warning so a green run
//     against an empty tree can't be mistaken for a real green.
//
// Delete this file once parity is confirmed.
// =============================================================================

import { getDocument } from './dtlkdata';

const RUN = process.env.RUN_DATALAKE_PARITY === '1';
const d = RUN ? describe : describe.skip;

const URL_BASE = 'https://arturo-mayorga.github.io/irl_stats/dist/data';

function ldArg(arg: string | number | undefined): string {
    return arg !== undefined && arg !== '' ? '/' + String(arg) : '';
}
function nNums(s: string): string {
    return s.replace('-', 'n');
}

// Same URL shape the old dtlkdata.ts used to construct.
function legacyUrl(query: { [k: string]: string | number }): string {
    return (
        `${URL_BASE}/${query.namespace}/${query.type}` +
        `${ldArg(query.league)}` +
        `${ldArg(query.season)}` +
        `${ldArg(query.subsession)}` +
        `${nNums(ldArg(query.simsession))}` +
        `${ldArg(query.driver)}` +
        `${ldArg(query.car)}` +
        `${ldArg(query.track)}` +
        `${ldArg(query.sessionType)}` +
        `${ldArg(query.custId)}` +
        `.json`
    );
}

async function fetchUrl(query: { [k: string]: string | number }): Promise<any> {
    const url = legacyUrl(query);
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Pick one canonical input per routing case. Matches keys used elsewhere in
// the test fixtures so the data is likely to exist in any reasonable tree.
const CASES: Array<{
    name: string;
    query: { [k: string]: string | number };
}> = [
    {
        name: 'ldata-irweb/leagueSeasonSessions',
        query: {
            namespace: 'ldata-irweb',
            type: 'leagueSeasonSessions',
            league: 4534,
            season: 105035,
        },
    },
    {
        name: 'ldata-irweb/leagueSeasons',
        query: {
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: 4534,
        },
    },
    {
        name: 'ldata-irweb/membersData',
        query: {
            namespace: 'ldata-irweb',
            type: 'membersData',
            league: 4534,
            season: 105035,
        },
    },
    {
        name: 'ldata-rsltsts/leagueDriverStats',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'leagueDriverStats',
            league: 4534,
        },
    },
    {
        name: 'ldata-rsltsts/singleMemberData',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'singleMemberData',
            driver: 807711,
        },
    },
    {
        name: 'ldata-stward/rulings',
        query: {
            namespace: 'ldata-stward',
            type: 'rulings',
            league: 4534,
            season: 105035,
        },
    },
];

d('dtlkdata URL ↔ loader parity', () => {
    for (const { name, query } of CASES) {
        test(
            name,
            async () => {
                const [fromUrl, fromLoader] = await Promise.all([
                    fetchUrl(query),
                    getDocument(query),
                ]);

                // Strict equality always — the dispatcher's contract is
                // identical bytes to the URL fetch. Both-null still passes
                // (null === null) but is loud about being inconclusive so an
                // empty local tree can't masquerade as a green run.
                if (fromUrl === null && fromLoader === null) {
                    console.warn(
                        `parity[${name}]: BOTH NULL — INCONCLUSIVE (URL ${legacyUrl(
                            query
                        )})`
                    );
                }

                expect(fromLoader).toEqual(fromUrl);
            },
            30_000
        );
    }
});
