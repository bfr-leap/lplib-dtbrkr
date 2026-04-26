// =============================================================================
// TEMPORARY: data-lake URL ↔ loader parity test
// =============================================================================
//
// Contract: getFromLoader(query) must return *byte-for-byte identical* data
// to getFromUrl(query) for every routing case. The shadow-mode dispatcher in
// production logs divergences live; this test confirms parity in a controlled
// environment without relying on traffic.
//
// Both helpers are imported from dtlkdata so this test can never drift from
// the real URL builder or the real loader-routing code.
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
//     against an empty tree can't be mistaken for actual confirmed parity.
//
// Delete this file once parity is confirmed.
// =============================================================================

import { getFromUrl, getFromLoader } from './dtlkdata';

const RUN = process.env.RUN_DATALAKE_PARITY === '1';
const d = RUN ? describe : describe.skip;

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
                    getFromUrl(query),
                    getFromLoader(query),
                ]);

                if (fromUrl === null && fromLoader === null) {
                    console.warn(
                        `parity[${name}]: BOTH NULL — INCONCLUSIVE (${JSON.stringify(query)})`
                    );
                }

                expect(fromLoader).toEqual(fromUrl);
            },
            30_000
        );
    }
});
