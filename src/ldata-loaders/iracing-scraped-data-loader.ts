/**
 *
 * This code defines a set of functions for reading and parsing JSON data from files. These functions are
 * designed to fetch various types of iRacing league-related data, such as league directories, seasons,
 * sessions, lap chart data, members' information, and telemetry data from files stored in a specified
 * directory. The code uses the 'fs' module to read JSON files and returns the parsed data corresponding
 * to the provided input parameters.
 *
 */

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';

import type {
    BlockedSeasons,
    LeagueDirectory,
    LeagueSeasons,
    LeagueSeasonSessions,
    LapChartData,
    MembersData,
    M_Helmet,
    SubsessionTelemetry,
} from 'ir-endpoint-types';
import {
    ldataReadFile,
    ldataReadFileAsync,
    ldataWriteFile,
    ldataWriteFileAsync,
} from './fsutil';

// TODO(upstream): move this interface to `ir-endpoint-types`. Mirrors the
// shape documented in `data-catalog/data-catalog.md` and confirmed against
// `data-catalog/samples/ldata-irweb/leagueRoster/sample.json`.
export interface LeagueRosterEntry {
    cust_id: number;
    display_name: string;
    helmet: M_Helmet;
    owner: boolean;
    admin: boolean;
    league_mail_opt_out: boolean;
    league_pm_opt_out: boolean;
    league_member_since: string;
    car_number: string;
    nick_name: string | null;
}

export interface LeagueRoster {
    private_roster: boolean;
    roster: LeagueRosterEntry[];
}

const MNT_PT = './public/data/ldata-irweb/';

export function getLeagueDirectory(): LeagueDirectory {
    let ret: LeagueDirectory = <LeagueDirectory>JSON.parse(
        readFileSync(`${MNT_PT}leagueDirectory.json`, {
            encoding: 'utf8',
            flag: 'r',
        })
    );

    return ret;
}

export async function getLeagueDirectoryAsync(): Promise<LeagueDirectory> {
    let ret: LeagueDirectory = <LeagueDirectory>JSON.parse(
        await readFile(`${MNT_PT}leagueDirectory.json`, {
            encoding: 'utf8',
            flag: 'r',
        })
    );

    return ret;
}

export function getLeagueSeasons(leagueId: number): LeagueSeasons | null {
    return ldataReadFile<LeagueSeasons>(MNT_PT, 'leagueSeasons', [leagueId]);
}

export function getLeagueSeasonsAsync(
    leagueId: number
): Promise<LeagueSeasons | null> {
    return ldataReadFileAsync<LeagueSeasons>(MNT_PT, 'leagueSeasons', [
        leagueId,
    ]);
}

export function saveLeagueSeasons(
    leagueId: number,
    data: LeagueSeasons
): void {
    ldataWriteFile(data, MNT_PT, 'leagueSeasons', [leagueId]);
}

export function saveLeagueSeasonsAsync(
    leagueId: number,
    data: LeagueSeasons
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'leagueSeasons', [leagueId]);
}

export function getLeagueSeasonSessions(
    leagueId: number,
    seasonId: number
): LeagueSeasonSessions | null {
    return ldataReadFile<LeagueSeasonSessions>(MNT_PT, 'leagueSeasonSessions', [
        leagueId,
        seasonId,
    ]);
}

export function getLeagueSeasonSessionsAsync(
    leagueId: number,
    seasonId: number
): Promise<LeagueSeasonSessions | null> {
    return ldataReadFileAsync<LeagueSeasonSessions>(
        MNT_PT,
        'leagueSeasonSessions',
        [leagueId, seasonId]
    );
}

export function saveLeagueSeasonSessions(
    leagueId: number,
    seasonId: number,
    data: LeagueSeasonSessions
): void {
    ldataWriteFile(data, MNT_PT, 'leagueSeasonSessions', [leagueId, seasonId]);
}

export function saveLeagueSeasonSessionsAsync(
    leagueId: number,
    seasonId: number,
    data: LeagueSeasonSessions
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'leagueSeasonSessions', [
        leagueId,
        seasonId,
    ]);
}

export function getLapChartData(
    subsessionId: number,
    simsessionNumber: number
): LapChartData | null {
    return ldataReadFile<LapChartData>(MNT_PT, 'lapChartData', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function getLapChartDataAsync(
    subsessionId: number,
    simsessionNumber: number
): Promise<LapChartData | null> {
    return ldataReadFileAsync<LapChartData>(MNT_PT, 'lapChartData', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveLapChartData(
    subsessionId: number,
    simsessionNumber: number,
    data: LapChartData
): void {
    ldataWriteFile(data, MNT_PT, 'lapChartData', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function saveLapChartDataAsync(
    subsessionId: number,
    simsessionNumber: number,
    data: LapChartData
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'lapChartData', [
        subsessionId,
        simsessionNumber,
    ]);
}

export function getMembersData(
    leagueId: number,
    seasonId: number
): MembersData | null {
    return ldataReadFile<MembersData>(MNT_PT, 'membersData', [
        leagueId,
        seasonId,
    ]);
}

export function getMembersDataAsync(
    leagueId: number,
    seasonId: number
): Promise<MembersData | null> {
    return ldataReadFileAsync<MembersData>(MNT_PT, 'membersData', [
        leagueId,
        seasonId,
    ]);
}

export function saveMembersData(
    leagueId: number,
    seasonId: number,
    data: MembersData
): void {
    ldataWriteFile(data, MNT_PT, 'membersData', [leagueId, seasonId]);
}

export function saveMembersDataAsync(
    leagueId: number,
    seasonId: number,
    data: MembersData
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'membersData', [
        leagueId,
        seasonId,
    ]);
}

// `blockedSeasons.json` is a single keyless file that lives directly under
// the namespace root, so it doesn't fit the dataset/keys path layout that
// `ldataReadFile(...)` builds. Read it directly and return null on missing
// file or parse error to honor the dispatcher's null-on-failure contract.
export function getBlockedSeasons(): BlockedSeasons | null {
    try {
        return JSON.parse(
            readFileSync(`${MNT_PT}blockedSeasons.json`, {
                encoding: 'utf8',
                flag: 'r',
            })
        ) as BlockedSeasons;
    } catch {
        return null;
    }
}

export async function getBlockedSeasonsAsync(): Promise<BlockedSeasons | null> {
    try {
        return JSON.parse(
            await readFile(`${MNT_PT}blockedSeasons.json`, {
                encoding: 'utf8',
                flag: 'r',
            })
        ) as BlockedSeasons;
    } catch {
        return null;
    }
}

export function getLeagueRoster(leagueId: number): LeagueRoster | null {
    return ldataReadFile<LeagueRoster>(MNT_PT, 'leagueRoster', [leagueId]);
}

export function getLeagueRosterAsync(
    leagueId: number
): Promise<LeagueRoster | null> {
    return ldataReadFileAsync<LeagueRoster>(MNT_PT, 'leagueRoster', [leagueId]);
}

export function saveLeagueRoster(leagueId: number, data: LeagueRoster): void {
    ldataWriteFile(data, MNT_PT, 'leagueRoster', [leagueId]);
}

export function saveLeagueRosterAsync(
    leagueId: number,
    data: LeagueRoster
): Promise<void> {
    return ldataWriteFileAsync(data, MNT_PT, 'leagueRoster', [leagueId]);
}
