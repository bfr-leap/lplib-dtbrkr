// =============================================================================
// Coverage regression test — guards against the dispatcher-wiring footgun.
//
// Iterates every entry in `DATA_LAKE_ENDPOINTS` and asserts that the
// dispatcher in `src/dtlkdata.ts` either routes it to a loader (returning a
// non-UNHANDLED sentinel) or has it explicitly marked `unshadowed` with a
// reason. The UNHANDLED sentinel is the runtime backstop — if any catalogued
// endpoint produces UNHANDLED, the static manifest has drifted from the
// dispatcher switch.
//
// Mocking strategy: rather than mocking each loader module by name (which
// drifts every time a new loader file is added to the dispatcher), we mock
// the file-system primitives the loaders share — `./ldata-loaders/fsutil`
// for the keyed dataset reads, and `fs/promises` for the few loaders that
// bypass fsutil (`getBlockedSeasonsAsync`, the steward rulings walker).
// Both are stubbed to return the same sentinel object, so any wired loader
// resolves to a non-null result and the test only fails when the dispatcher
// is missing a case for a catalogued (namespace, type) pair.
// =============================================================================

const SENTINEL = { __coverage_sentinel: true };

vi.mock('./ldata-loaders/fsutil', () => ({
    ldataReadFile: vi.fn(() => SENTINEL),
    ldataReadFileAsync: vi.fn(async () => SENTINEL),
    ldataWriteFile: vi.fn(),
    ldataWriteFileAsync: vi.fn(async () => undefined),
}));

vi.mock('./ldata-loaders/kafka-notify', () => ({
    notifyWrite: vi.fn(),
}));

vi.mock('fs/promises', async () => {
    const actual = await vi.importActual<typeof import('fs/promises')>(
        'fs/promises'
    );
    return {
        ...actual,
        readFile: vi.fn(async () => JSON.stringify(SENTINEL)),
    };
});

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

    test('every manifest entry produces a non-UNHANDLED result — the runtime backstop must agree with the static manifest', async () => {
        const unhandled: string[] = [];
        for (const entry of DATA_LAKE_ENDPOINTS) {
            const result = await getFromLoader({
                namespace: entry.namespace,
                type: entry.type,
                ...entry.exampleQuery,
            });
            if (result === UNHANDLED) unhandled.push(label(entry));
        }
        expect(unhandled).toEqual([]);
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

                    // No catalogued endpoint may fall through the switch.
                    expect(result).not.toBe(UNHANDLED);

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
