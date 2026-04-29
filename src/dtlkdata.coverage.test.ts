// =============================================================================
// Coverage regression test — guards against the dispatcher-wiring footgun.
//
// Iterates every entry in `DATA_LAKE_ENDPOINTS` and asserts that the
// dispatcher in `src/dtlkdata.ts` either routes it to a loader (returning a
// non-null sentinel) or has it explicitly marked `unshadowed` with a reason.
//
// Each loader module is mocked with a Proxy whose `get` returns an async
// function resolving to a SENTINEL value, so we don't need to maintain a
// per-export mock list — newly added loader functions are auto-stubbed.
// =============================================================================

// Auto-stub every export of every loader module the dispatcher imports.
// Returning a function for any property name (including ts-jest's
// `__esModule` interop probe) makes `import { fooAsync } from 'mod'`
// resolve to `() => Promise.resolve(SENTINEL_RESULT)`. The factory has
// to be inlined: Jest hoists `jest.mock(...)` calls above all source-file
// declarations, so the factory cannot reference outer module bindings.
jest.mock('./ldata-loaders/iracing-scraped-data-loader', () =>
    new Proxy(
        {},
        {
            get: (_t, prop) => {
                if (prop === '__esModule') return true;
                return async () => ({ __coverage_sentinel: true });
            },
        }
    )
);
jest.mock('./ldata-loaders/iracing-derived-data-loader', () =>
    new Proxy(
        {},
        {
            get: (_t, prop) => {
                if (prop === '__esModule') return true;
                return async () => ({ __coverage_sentinel: true });
            },
        }
    )
);
jest.mock('./ldata-loaders/ldata-stward-data-loader', () =>
    new Proxy(
        {},
        {
            get: (_t, prop) => {
                if (prop === '__esModule') return true;
                return async () => ({ __coverage_sentinel: true });
            },
        }
    )
);

import { getFromLoader } from './dtlkdata';
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
                    ? `is exempt from shadow-mode (reason: ${entry.unshadowed.reason}) — dispatcher must return null`
                    : 'is wired into the dispatcher — must return non-null for a valid query',
                async () => {
                    const result = await getFromLoader({
                        namespace: entry.namespace,
                        type: entry.type,
                        ...entry.exampleQuery,
                    });

                    if (entry.unshadowed) {
                        expect(result).toBeNull();
                    } else {
                        // If this fails, you added a manifest entry without
                        // wiring the case in src/dtlkdata.ts (or the
                        // exampleQuery is missing keys the dispatcher
                        // requires before reaching the loader call).
                        expect(result).not.toBeNull();
                    }
                }
            );
        }
    );
});
