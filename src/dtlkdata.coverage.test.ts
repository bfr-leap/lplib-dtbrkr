// =============================================================================
// Coverage regression test — guards against the dispatcher-wiring footgun.
//
// Iterates every entry in `DATA_LAKE_ENDPOINTS` and asserts that the
// dispatcher in `src/dtlkdata.ts` either routes it to a loader (returning a
// non-`UNHANDLED` value) or has it explicitly marked `unshadowed` with a
// reason (in which case the dispatcher is expected to fall through and
// return the `UNHANDLED` sentinel).
//
// Each loader module is mocked with a Proxy whose `get` returns an async
// function resolving to a SENTINEL value, so we don't need to maintain a
// per-export mock list — newly added loader functions are auto-stubbed.
// =============================================================================

// Auto-stub every export of every loader module the dispatcher imports.
// We use `importOriginal` to discover the real export names and replace each
// with an async stub that returns a sentinel object. This avoids hand-listing
// per-export mocks (any new loader function is auto-covered) while still
// satisfying Vitest's named-import validator, which checks that each import
// name is actually present on the mock module.
const { stubAll } = vi.hoisted(() => ({
    stubAll: async (
        importOriginal: () => Promise<Record<string, unknown>>
    ): Promise<Record<string, unknown>> => {
        const actual = await importOriginal();
        const stubs: Record<string, unknown> = {};
        for (const key of Object.keys(actual)) {
            stubs[key] = async () => ({ __coverage_sentinel: true });
        }
        return stubs;
    },
}));

vi.mock('./ldata-loaders/iracing-scraped-data-loader', stubAll);
vi.mock('./ldata-loaders/iracing-derived-data-loader', stubAll);
vi.mock('./ldata-loaders/ldata-stward-data-loader', stubAll);
vi.mock('./ldata-loaders/ldata-chart-data-loader', stubAll);
vi.mock('./ldata-loaders/ldata-gentxt-data-loader', stubAll);
vi.mock('./ldata-loaders/ldata-irrpy-data-loader', stubAll);

import { getFromLoader, UNHANDLED } from './dtlkdata';
import {
    DATA_LAKE_ENDPOINTS,
    type DataLakeEndpoint,
} from './data-lake-manifest';

const label = (e: DataLakeEndpoint) => `${e.namespace}/${e.type}`;

describe('data-lake dispatcher coverage', () => {
    test('manifest is non-empty (sanity check)', () => {
        expect(DATA_LAKE_ENDPOINTS.length).toBeGreaterThan(0);
    });

    test('every manifest entry is unique', () => {
        const seen = new Set<string>();
        const duplicates: string[] = [];
        for (const entry of DATA_LAKE_ENDPOINTS) {
            const key = label(entry);
            if (seen.has(key)) duplicates.push(key);
            seen.add(key);
        }
        expect(duplicates).toEqual([]);
    });

    describe.each(DATA_LAKE_ENDPOINTS.map((e) => [label(e), e] as const))(
        '%s',
        (_name, entry) => {
            test(
                entry.unshadowed
                    ? `is exempt from shadow-mode (reason: ${entry.unshadowed.reason}) — dispatcher must fall through to UNHANDLED`
                    : 'is wired into the dispatcher — must NOT fall through to UNHANDLED',
                async () => {
                    const result = await getFromLoader({
                        namespace: entry.namespace,
                        type: entry.type,
                        ...entry.exampleQuery,
                    });

                    if (entry.unshadowed) {
                        expect(result).toBe(UNHANDLED);
                    } else {
                        // If this fails, you added a manifest entry without
                        // wiring the case in src/dtlkdata.ts (or the
                        // exampleQuery is missing keys the dispatcher
                        // requires before reaching the loader call).
                        expect(result).not.toBe(UNHANDLED);
                    }
                }
            );
        }
    );
});
