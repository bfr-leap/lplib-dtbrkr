<a href="https://bluefrogracing.com/">
    <img src="https://bfr-leap.github.io/artas-sysdoc/icons/ldata-irweb.webp" alt="LEAP" title="irl_stats" align="right" height="60" />
</a>

# LEAP DB Update Catalog

This document catalogs the Kafka update messages emitted for LEAP database
state changes. It is the companion to [`data-catalog.md`](data-catalog.md),
which covers datalake (`ldata-*`) updates.

DB updates use the same envelope shape as datalake updates so a single consumer
codebase can parse both. The differences are namespace prefix (`db-` vs.
`ldata-`), topic, and the way `affected_fields` describes a logical entity
rather than a file path.

## Quick Reference

| Namespace | Description | Backed by |
|-----------|-------------|-----------|
| [`db-user-cfg`](#db-user-cfg) | Per-user configuration and identity | `user_ir_cust_mappings`, `users_leagues_interest`, `users_app_features`, `discord_user_mappings` |
| [`db-league-cfg`](#db-league-cfg) | Per-league configuration | `leagues`, `journalists_leagues`, `seasons`, `sched_subsessions`, `teams`, `teams_users` |
| [`db-app-cfg`](#db-app-cfg) | Global / cross-league config | `journalists`, `tracks`, `app_features` |
| [`db-tracktalk`](#db-tracktalk) | TrackTalk subscription and publication state | `tracktalk_subscriptions`, `tracktalk_publications`, `tracktalk_dotd_publications` |
| [`db-steward`](#db-steward) | Steward subsystem config | `steward_config` |

The following tables are intentionally **not** published:

| Table | Reason |
|-------|--------|
| `tracktalk_raw_message_ingest` | High-volume append-only audit log; no consumer benefit |
| `user_ir_cust_mappings.verify_code` | Secret. The entity event is published, but consumers must re-read non-secret fields only |

---

## Envelope

DB messages are JSON values on the topic `db-update-log`, using the same
envelope as [`ldata-update-log`](data-catalog.md):

```jsonc
{
  "dataset_id":      "db-user-cfg:strm",          // namespace + ":strm"
  "source":          "lplib-ldloadutl",            // producer client id
  "timestamp":       1714758000,                   // Unix seconds
  "update_type":     "insert" | "update" | "delete",
  "affected_fields": ["leaguesInterest/12345"],    // logical entity path
  "change_summary":  "update: leaguesInterest 12345"
}
```

### Conventions

- **Pointer, not payload.** `affected_fields` identifies the logical entity
  that changed; the message does not include row contents. Consumers re-read
  from sqlite (or a downstream projection) to get the new value.
- **Logical entities, not tables.** A pivot table never appears as an entity.
  A change to `users_leagues_interest` for user `42` publishes
  `leaguesInterest/42` — one message per logical change, regardless of how
  many rows were inserted, updated, or deleted inside the transaction.
- **Entity path shape.** `entityName/<key1>[/<key2>...]`, with keys in the
  order documented per entity below. String keys pass through verbatim;
  negative integer keys are encoded as `n<abs>` (matching the datalake
  convention in `src/ldata-loaders/kafka-notify.ts`).
- **`update_type` semantics.**
  - `insert` — entity did not exist before.
  - `update` — entity existed; one or more of its attributes changed.
  - `delete` — entity no longer exists.
  - For set-valued entities (e.g. `leaguesInterest`, `appFeaturesEnrollment`)
    we only emit `update`; row-level inserts/deletes inside the set are not
    individually visible.
- **Notify call site.** Producers call `notifyDbWrite` from the use-case
  function that owns the logical change (not from `db.ts`), so a single
  business action emits a single message even when it touches multiple rows
  or tables.
- **Cross-namespace transactions.** When a use case affects entities in more
  than one namespace, emit one message per namespace.

---

## Namespaces

### `db-user-cfg`

Per-user state owned by an end user (Discord/iRacing identity, league
preferences, feature opt-ins). Keyed by `user_id` (Discord snowflake string).

| Entity | Path | Keys | Update Types | Backing Tables |
|--------|------|------|--------------|----------------|
| `irCustMapping` | `irCustMapping/<user_id>` | `user_id` | `insert`, `update`, `delete` | `user_ir_cust_mappings` |
| `leaguesInterest` | `leaguesInterest/<user_id>` | `user_id` | `update` | `users_leagues_interest` |
| `appFeaturesEnrollment` | `appFeaturesEnrollment/<user_id>` | `user_id` | `update` | `users_app_features` |
| `discordIdentity` | `discordIdentity/<user_id>/<guild_id>` | `user_id`, `guild_id` | `insert`, `update`, `delete` | `discord_user_mappings` |

Notes:
- `irCustMapping` covers verification flow transitions. The entity event is
  published on each state change, but `verify_code` itself is never on the
  wire — consumers reading the row after the event will only see whether
  verification has progressed.
- `leaguesInterest` is a set; emit one `update` per use-case call regardless
  of how many league rows are added or removed.

---

### `db-league-cfg`

Per-league configuration. Keyed by `league_id` (integer). Some entities are
sub-keyed by `season_id` or another id.

| Entity | Path | Keys | Update Types | Backing Tables |
|--------|------|------|--------------|----------------|
| `league` | `league/<league_id>` | `league_id` | `insert`, `update`, `delete` | `leagues` |
| `journalistAssignment` | `journalistAssignment/<league_id>` | `league_id` | `update` | `journalists_leagues` |
| `season` | `season/<league_id>/<season_id>` | `league_id`, `season_id` | `insert`, `update`, `delete` | `seasons` |
| `schedSubsessions` | `schedSubsessions/<league_id>/<season_id>` | `league_id`, `season_id` | `update` | `sched_subsessions` |
| `team` | `team/<league_id>/<season_id>/<team_id>` | `league_id`, `season_id`, `team_id` | `insert`, `update`, `delete` | `teams`, `teams_users` |

Notes:
- `journalistAssignment` is a set of journalists per league; emit one `update`
  for the league's full assignment list, not per-row.
- `team` rolls up the team row and its membership rows (`teams_users`) under
  one entity. If membership changes for a team, emit an `update` on that
  team's path.
- `seasons.is_active` toggles emit `update` on `season/<league_id>/<season_id>`.

---

### `db-app-cfg`

Global, cross-league reference data managed by admins.

| Entity | Path | Keys | Update Types | Backing Tables |
|--------|------|------|--------------|----------------|
| `journalist` | `journalist/<journalist_id>` | `journalist_id` | `insert`, `update`, `delete` | `journalists` |
| `track` | `track/<track_id>` | `track_id` | `insert`, `update`, `delete` | `tracks` |
| `appFeature` | `appFeature/<feature_id>` | `feature_id` | `insert`, `update`, `delete` | `app_features` |

Notes:
- A change to a `journalist`'s style or prompt publishes here; a change to
  *which journalists are assigned to which league* publishes under
  `db-league-cfg/journalistAssignment`.
- `track_id` is the iRacing track id stored in the row, not the sqlite row
  primary key.

---

### `db-tracktalk`

State owned by the TrackTalk subsystem.

| Entity | Path | Keys | Update Types | Backing Tables |
|--------|------|------|--------------|----------------|
| `subscription` | `subscription/<league_id>/<channel_id>` | `league_id`, `channel_id` | `insert`, `delete` | `tracktalk_subscriptions` |
| `publication` | `publication/<subsession_id>/<channel_id>` | `subsession_id`, `channel_id` | `insert`, `delete` | `tracktalk_publications` |
| `dotdPublication` | `dotdPublication/<subsession_id>/<cust_id>/<channel_id>` | `subsession_id`, `cust_id`, `channel_id` | `insert`, `delete` | `tracktalk_dotd_publications` |

Notes:
- These are set-membership rows. We model each row as its own entity (rather
  than rolling up to a parent set) because consumers need fine-grained
  visibility into individual subscriptions/publications.
- `update` is unused; subscriptions and publications either exist or don't.

---

### `db-steward`

Steward subsystem configuration.

| Entity | Path | Keys | Update Types | Backing Tables |
|--------|------|------|--------------|----------------|
| `stewardConfig` | `stewardConfig/<league_id>` | `league_id` | `insert`, `update`, `delete` | `steward_config` |

---

## Adding a New Entity

When adding a new db-backed feature:

1. Decide which namespace owns it. If none fits, propose a new namespace
   here before publishing.
2. Pick an entity name in `lowerCamelCase`. The name should describe the
   logical thing that changed, not the table.
3. Document the key order. Keys should go from broadest scope (e.g.
   `league_id`) to narrowest (e.g. `team_id`).
4. Decide which `update_type`s the entity emits, based on whether it's a
   single row, a set, or a row with creation/destruction semantics.
5. Identify the use-case function that owns the change and place the
   `notifyDbWrite` call there — not in `db.ts`.
