# Feasibility Report: Migrating `lplib-dtbrkr` Data-Lake Reads to `lplib-ldloadutl`

**Status:** Analysis / proposal — no code changes yet.
**Scope:** Replace the GitHub-Pages HTTP fetch in `src/dtlkdata.ts` with reads
sourced from `lplib-ldloadutl` while keeping the rest of the broker stable.

---

## 1. Current state in `lplib-dtbrkr`

### 1.1 Where the data lake is loaded

`src/dtlkdata.ts` is a 30-line module that builds a URL against a hard-coded
GitHub Pages host and returns the parsed JSON, or `null` on any error:

```ts
// src/dtlkdata.ts:13
const url = `https://arturo-mayorga.github.io/irl_stats/dist/data/${
    query.namespace + '/'
}${query.type}${ldArg(query.league)}${ldArg(query.season)}…`;
```

Notable details:

- Path is built positionally from `query.{namespace,type,league,season,
  subsession,simsession,driver,car,track,sessionType,custId}`.
- Negative-number encoding (`-1` → `n1`) is applied to **`simsession` only**.
  Every other key is interpolated as-is.
- The function swallows all errors and returns `null` — every call site
  depends on this behavior (`dlDoc?.sessions?…`, `if (!dlDoc) return …`).

### 1.2 Routing layer

`src/ftchdata.ts` is the public entry point. It dispatches by namespace and
falls through to the data lake for any namespace it does not handle locally:

| Namespace        | Handler                       |
|------------------|-------------------------------|
| `ldata-usrdata`  | `userDataHandler` (DB)        |
| `ldata-admcfg`   | `adminConfigHandler` (DB)     |
| `ldata-usrcfg`   | `userConfigHandler` (DB + DL) |
| `ldata-stward`   | `stewardHandler` (DB + DL)    |
| _(everything else)_ | `getDataLakeDocument` (HTTP) |

`getDataLakeDocument` is also re-exported from `src/index.ts` and called
directly by other modules — so the migration target is broader than
`ftchdata.ts` alone.

### 1.3 Direct call sites of `getDataLakeDocument`

Found via `grep -rn 'getDataLakeDocument' src`:

| File                      | Lines                      | Namespace      | Type                  | Keys passed                  |
|---------------------------|----------------------------|----------------|-----------------------|------------------------------|
| `src/usrcfg.ts`           | 99, 165, 237, 279          | `ldata-irweb`  | `leagueSeasonSessions`| `league`, `season`           |
| `src/usrdata.ts`          | 232, 301, 371, 414         | `ldata-irweb`  | `leagueSeasonSessions`| `league`, `season`           |
| `src/valid-util.ts`       | 22                         | `ldata-irweb`  | `leagueSeasonSessions`| `league`, `season`           |
| `src/stward.ts`           | 22                         | `ldata-stward` | `rulings`             | `league`, `season`           |
| `src/ftchdata.ts`         | 54 (fallthrough)           | _any_          | _any_                 | full query                   |

Indirect call sites via `getDocument(namespace, query)`:

| File                                    | Namespace        | Type                  |
|-----------------------------------------|------------------|-----------------------|
| `src/page-data-util/page-data-home.ts`  | `ldata-irweb`    | `leagueSeasonSessions`, `leagueSeasons` |
| `src/page-data-util/page-data-home.ts`  | `ldata-rsltsts`  | `leagueDriverStats`, `singleMemberData` |
| `src/page-data-util/page-data-standings.ts` | `ldata-irweb` | `membersData`, `leagueSeasons` |
| `src/page-data-util/page-data-standings.ts` | `ldata-rsltsts` | `leagueDriverStats` |

So in practice the data lake is hit for **three namespaces** (`ldata-irweb`,
`ldata-rsltsts`, `ldata-stward`) covering **six dataset types**.

---

## 2. What `lplib-ldloadutl` provides

`local_reference/lplib-ldloadutl/src/index.ts` exposes one typed loader per
dataset, sync + async, read + write:

| Namespace        | Module                                    | Mount point                  |
|------------------|-------------------------------------------|------------------------------|
| `ldata-irweb`    | `iracing-scraped-data-loader.ts`          | `./public/data/ldata-irweb/` |
| `ldata-rsltsts`  | `iracing-derived-data-loader.ts`          | `./public/data/ldata-rsltsts/` |
| `ldata-irrpy`    | `ldata-irrpy-data-loader.ts`              | `./public/data/ldata-irrpy/` |
| `ldata-xftelem`  | `ldata-xftelem-data-loader.ts`            | `./public/data/ldata-xftelem/` |
| `ldata-trkevts`  | `ldata-trkevts-data-loader.ts`            | `./public/data/ldata-trkevts/` |
| `ldata-charts`   | `ldata-chart-data-loader.ts`              | `./public/data/ldata-charts/` |
| `ldata-gentxt`   | `ldata-gentxt-data-loader.ts`             | `./public/data/ldata-gentxt/` |
| `ldata-pdcsrc`   | `ldata-pdcsrc-data-loader.ts`             | `./public/data/ldata-pdcsrc/` |
| `ldata-usrcfg`   | `ldata-usrcfg-data-loader.ts`             | `./public/data/ldata-usrcfg/` |
| `ldata-stward`   | `ldata-stward-data-loader.ts`             | `./public/data/ldata-stward/` |

Common pieces:

- `fsutil.ts::ldataReadFile<T>(mountPoint, datasetName, keys)` — generic
  reader, returns `null` on read error (matches `dtlkdata`'s contract).
- `fsutil.ts::ldataWriteFile` — every write also calls
  `kafka-notify::notifyWrite` to publish to topic `ldata-update-log`. Reads
  do **not** touch Kafka.
- Negative-key encoding is `n${-k}` for **every** numeric key (not just
  `simsession`).
- Types are imported from `ir-endpoints-types`.

---

## 3. Gap analysis

### 3.1 Functional gaps in `ldloadutl`

The broker pulls two `ldata-rsltsts` types that are **not exported** by
`iracing-derived-data-loader.ts`:

- `leagueDriverStats` — file pattern `leagueDriverStats/{league_id}.json`
  (per `data-catalog.md`).
- `singleMemberData` — file pattern `singleMemberData/{cust_id}.json`.

Action: add `getLeagueDriverStats(leagueId)` and `getSingleMemberData(custId)`
to `lplib-ldloadutl` before the migration, or temporarily call
`ldataReadFile` directly in the adapter.

### 3.2 Dependency naming inconsistency

- `lplib-dtbrkr/package.json` → `"ir-endpoint-types"` (no `s`)
- `lplib-ldloadutl/package.json` → `"ir-endpoints-types"` (with `s`)

These resolve to the **same** GitHub repo (`bfr-leap/ir-endpoint-types`) but
under different npm aliases. After the merge they must agree, otherwise types
will appear duplicated and won't be assignable across module boundaries.
Recommend standardizing on the dtbrkr name (`ir-endpoint-types`) since
that name matches the upstream repo, and updating the ldloadutl imports.

### 3.3 Negative-key encoding mismatch

`dtlkdata.ts::nNums` only encodes `simsession`. `fsutil.ts` encodes every key.
For the namespaces actually in use (`ldata-irweb`, `ldata-rsltsts`,
`ldata-stward`) the keys are league_id / season_id / cust_id which are always
positive in practice — so this is a latent risk, not an active bug. Document
the new behavior; the encoding change is *more* correct, not less.

### 3.4 Mount-point assumption

`ldloadutl` hard-codes `./public/data/<namespace>/`. The broker is not
guaranteed to run from a CWD that contains a `public/` tree. The path needs
to be configurable — see §5.4.

### 3.5 Error-handling contract drift

`dtlkdata` returns `null` on every failure mode. `ldataReadFile` does too,
but `getLeagueDirectory` and `getActiveLeagueSchedule` in `ldloadutl` use
bare `readFileSync` and **throw** on missing files. If the adapter routes
`leagueDirectory` or `activeLeagueSchedule` queries through these, callers
that previously received `null` will start receiving exceptions. Wrap them.

### 3.6 Optional Kafka coupling

`kafka-notify.ts` requires `kafkajs` and reaches out to `leap-relay1:9092`
on first write. Reads are unaffected. Because the broker is read-only from
the data lake's perspective, the Kafka client will never actually connect —
but `kafkajs` will still be installed as a transitive dep. Acceptable, but
worth noting.

---

## 4. Migration approaches

### Option A — Adapter shim inside `dtlkdata.ts` *(recommended first step)*

Keep the existing `getDocument(query)` signature and route by
`query.namespace` + `query.type` to typed `ldloadutl` calls:

```ts
// proposed src/dtlkdata.ts
import * as ldl from 'lplib-ldloadutl';

export async function getDocument(query: { [k: string]: string | number }) {
    const ns = String(query.namespace);
    const type = String(query.type);

    switch (`${ns}/${type}`) {
        case 'ldata-irweb/leagueSeasonSessions':
            return ldl.getLeagueSeasonSessionsAsync(+query.league, +query.season);
        case 'ldata-irweb/leagueSeasons':
            return ldl.getLeagueSeasonsAsync(+query.league);
        case 'ldata-irweb/membersData':
            return ldl.getMembersDataAsync(+query.league, +query.season);
        case 'ldata-rsltsts/leagueDriverStats':
            return ldl.getLeagueDriverStatsAsync(+query.league);   // new
        case 'ldata-rsltsts/singleMemberData':
            return ldl.getSingleMemberDataAsync(+query.driver);    // new
        case 'ldata-stward/rulings':
            return ldl.getStewardRulingsAsync(+query.league, +query.season);
    }
    return null;
}
```

**Pros**

- Smallest possible diff. All existing `getDataLakeDocument({…})` call sites
  keep working.
- The router stays in one place; future migrations move from "URL contract"
  to "typed contract" by deleting cases.
- Testable in isolation by mocking the `lplib-ldloadutl` import.

**Cons**

- The dynamic `{namespace, type, …}` shape lives forever unless followed up.
- An unknown namespace/type silently returns `null` — same as today, but
  worth logging.

### Option B — Replace call sites with typed APIs

Walk the seven internal call sites and replace
`getDataLakeDocument({namespace, type, league, season})` with the typed
function from `lplib-ldloadutl`:

```ts
// before
const dlDoc = await getDataLakeDocument({
    namespace: 'ldata-irweb',
    type: 'leagueSeasonSessions',
    league: ret.league_id,
    season: ret.season_id,
});

// after
const dlDoc = await getLeagueSeasonSessionsAsync(ret.league_id, ret.season_id);
```

**Pros**

- Eliminates the stringly-typed routing layer entirely.
- Type-checked queries; misuse is caught at build time.
- Each module declares the data it actually needs.

**Cons**

- ~15 mechanical edits across 5 files plus the page-data utilities, which
  go through `getDocument` not `getDataLakeDocument`.
- `ftchdata::getDocument(namespace, query)` is the public re-export of the
  broker — external consumers (other repos) may call it with arbitrary
  namespaces. Removing the dynamic dispatch is a public-API break unless we
  keep the shim around for compatibility.

### Option C — Vendor the loaders into `lplib-dtbrkr`

Copy `src/ldata-loaders/` into `lplib-dtbrkr/src/`. Drop the package
dependency entirely.

**Pros**

- No new npm dep; one less moving part.

**Cons**

- The whole point of `lplib-ldloadutl` being a separate package is so that
  multiple backend services can share the contract. Vendoring forks the
  contract and guarantees drift.
- Bloats the broker, which already mixes Vue/Pinia/Clerk client deps with
  server-side logic.

**Recommendation:** **Option A first, Option B as a follow-up sweep.**
Option C is not worth the long-term cost.

---

## 5. Best-practice items for either option

### 5.1 Treat `lplib-ldloadutl` as a versioned dep

Add to `lplib-dtbrkr/package.json` matching the existing
`ir-endpoint-types` pattern:

```json
"lplib-ldloadutl": "github:bfr-leap/lplib-ldloadutl#main"
```

Pin to a tag or commit once the surface stabilizes (v1.2.0 onward).

### 5.2 Reconcile the `ir-endpoint-types` package name first

Before pinning, open a PR against `lplib-ldloadutl` to rename
`ir-endpoints-types` → `ir-endpoint-types`. Without this, two copies of the
same shared types module enter the broker's `node_modules` and any
`StewardRuling`-typed value crossing the boundary becomes structurally
typed instead of nominally typed.

### 5.3 Fill the `ldata-rsltsts` gap upstream

Add `getLeagueDriverStats` / `getSingleMemberData` (and async variants) to
`lplib-ldloadutl/src/ldata-loaders/iracing-derived-data-loader.ts`. This
keeps the loader package as the single source of truth for dataset paths
and avoids the broker calling `ldataReadFile` directly.

### 5.4 Make the data root configurable

Replace the hard-coded `./public/data/<ns>/` mount points with a function
of an env var (e.g. `LDATA_ROOT`, default `./public/data`). The broker can
then be deployed wherever the data volume is mounted without monkey-patching
CWD. Suggested change in `lplib-ldloadutl`:

```ts
const LDATA_ROOT = process.env.LDATA_ROOT ?? './public/data';
const MNT_PT = `${LDATA_ROOT}/ldata-irweb/`;
```

### 5.5 Preserve the `null`-on-failure contract at the seam

For loaders in `ldloadutl` that throw on missing files
(`getLeagueDirectory`, `getActiveLeagueSchedule`), wrap them inside the
adapter so the broker continues to see `null`:

```ts
async function safe<T>(p: Promise<T>): Promise<T | null> {
    try { return await p; } catch { return null; }
}
```

### 5.6 Tests

- Replace `__tests__/dtlkdata/dtlkdata.test.ts` (currently mocks `fetch`)
  with a test that mocks the `lplib-ldloadutl` import.
- Existing `__tests__/ftchdata/`, `__tests__/usrcfg/`, `__tests__/usrdata/`,
  `__tests__/page-data/` already mock `../../src/dtlkdata` — they continue
  to work unchanged with Option A.
- Add an integration smoke test that points the loader at
  `data-catalog/samples/` to verify the file-shape contract end-to-end.

### 5.7 Logging / observability

`dtlkdata.ts` logs every fetch URL. The migrated path should keep an
equivalent line — either inside the adapter or as a thin wrapper — so log
parity is preserved during rollout.

### 5.8 Roll-out

Feature-flag the seam:

```ts
const useLdLoadUtl = process.env.LDATA_BACKEND === 'fs';
```

Deploy with the flag off, validate logs/metrics, then flip. Once stable,
delete the legacy URL fetch path and the flag.

### 5.9 `data-catalog/`

The catalog already lives in `lplib-dtbrkr`. Once the broker no longer
fetches from `arturo-mayorga.github.io`, update `data-catalog.md`:

- Drop the GitHub Pages URL as a "where the data comes from" reference.
- Note that the canonical source is the filesystem layout populated by
  upstream `dprdc-*` jobs and read via `lplib-ldloadutl`.

---

## 6. Effort & risk summary

| Item                                                  | Effort | Risk   |
|-------------------------------------------------------|--------|--------|
| Rename `ir-endpoints-types` in ldloadutl              | XS     | Low    |
| Add `leagueDriverStats` / `singleMemberData` loaders  | S      | Low    |
| Make `LDATA_ROOT` configurable                        | XS     | Low    |
| Adapter shim in `dtlkdata.ts` (Option A)              | S      | Low    |
| Replace direct call sites with typed APIs (Option B)  | M      | Medium — public API contract |
| Update tests                                          | S      | Low    |
| Roll-out with feature flag                            | XS     | Low    |

**Bottom line:** The migration is well-bounded. The two repos already
share a vocabulary (`ldata-*` namespaces, the same dataset names, the same
type package). The work is mostly mechanical: stand up an adapter, fill
two missing loaders upstream, make the data root configurable, and ship
behind a flag. Option A keeps blast radius minimal; Option B is the
clean follow-up once Option A is in production.
