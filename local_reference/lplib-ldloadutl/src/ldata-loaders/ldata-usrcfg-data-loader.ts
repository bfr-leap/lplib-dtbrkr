import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';

import type { ActiveLeagueSchedule } from 'ir-endpoints-types';

const MNT_PT = './public/data/ldata-usrcfg/';

export function getActiveLeagueSchedule(): ActiveLeagueSchedule {
    let ret: ActiveLeagueSchedule = <ActiveLeagueSchedule>JSON.parse(
        readFileSync(`${MNT_PT}activeLeagueSchedule.json`, {
            encoding: 'utf8',
            flag: 'r',
        })
    );

    return ret;
}

export async function getActiveLeagueScheduleAsync(): Promise<ActiveLeagueSchedule> {
    let ret: ActiveLeagueSchedule = <ActiveLeagueSchedule>JSON.parse(
        await readFile(`${MNT_PT}activeLeagueSchedule.json`, {
            encoding: 'utf8',
            flag: 'r',
        })
    );

    return ret;
}
