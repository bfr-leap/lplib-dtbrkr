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
    LeagueDirectory,
    LeagueSeasons,
    LeagueSeasonSessions,
    LapChartData,
    MembersData,
    SubsessionTelemetry,
} from 'ir-endpoints-types';
import { ldataReadFile, ldataReadFileAsync } from './fsutil';

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
