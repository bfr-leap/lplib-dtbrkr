# Data Samples

This directory contains trimmed, representative JSON samples from every dataset in the `irl_stats` repository. Each sample preserves the exact schema and field names of the full dataset but is reduced to 1-3 records for readability.

## Purpose

These samples serve two goals:

1. **AI coding tool context** — Drop these into a consuming repo so that AI assistants (Claude, Copilot, etc.) can understand the data shapes without needing access to the full multi-GB datasets.
2. **Developer reference** — Quick schema lookup without opening large production files.

## Directory Layout

```
samples/
├── ldata-irweb/
│   ├── lapChartData/sample.json
│   ├── leagueRoster/sample.json
│   ├── leagueSeasons/sample.json
│   ├── leagueSeasonSessions/sample.json
│   └── membersData/sample.json
├── ldata-rsltsts/
│   ├── driverSessionResults/sample.json
│   ├── simSessionResults/sample.json
│   ├── leagueDriverStats/sample.json
│   ├── leagueSimsessionIndex/sample.json
│   ├── simsessionDriverTelemetry/sample.json
│   ├── singleMemberData/sample.json
│   ├── trackInfoDirectory/sample.json
│   └── trackResults/sample.json
├── ldata-irrpy/
│   ├── telemetryScans/sample.json
│   └── telemetrySubsessions/sample.json
├── ldata-charts/
│   ├── cumulativeDeltaBestLapChartData/sample.json
│   ├── cumulativeDeltaChartData/sample.json
│   ├── pacePercentChartData/sample.json
│   ├── pacePercentVsIdealLapChartData/sample.json
│   └── startFinishChartData/sample.json
├── ldata-gentxt/
│   ├── simsessionSummary/sample.json
│   └── simsessionHighlights/sample.json
└── ldata-usrcfg/
    ├── activeLeagueSchedule.json
    ├── blockedSeasons.json
    ├── trackDisplayInfo.json
    └── leagueTeamsInfo/sample.json
```

## Pulling Samples into a Consuming Repo

Use the pull script from the repo root:

```bash
./scripts/pull-leap-catalog.sh
```

This copies the catalog and samples into your project. See `data-catalog.md` for full schema documentation.
