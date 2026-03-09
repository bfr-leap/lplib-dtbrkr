import { getActiveLeagueSchedule } from '../lib-usrcfg/active-league-schedule';
import { getDocument } from '../ftchdata';
import { defLgSeasSubCtx } from './page-data-util';

export async function getStandingsPageData(query: { [name: string]: string }): Promise<any> {
    let ctx = await defLgSeasSubCtx(query);

    let league_id: string = ctx['league_id']?.toString() || '';
    let season_id: string = ctx['season_id']?.toString() || '';

    let leagueSchedule = await getActiveLeagueSchedule(false);

    let leagueFromSchedule = leagueSchedule.leagues?.filter((l: any) => league_id === l.league_id.toString())[0] || {};
    let seasonFromSchedule = leagueFromSchedule.seasons?.filter((season: any) => season_id === season.season_id.toString())[0] || {};

    let metadata = {
        league_name: leagueFromSchedule?.name || 'League Name not Found',
        league_id: league_id,
        season_name: seasonFromSchedule?.comment || 'Season Name not Found',
        season_id: season_id
    }

    let q: any = {
        type: 'leagueDriverStats', namespace: 'ldata-rsltsts', league: league_id
    };
    let leagueDriverStats = await getDocument('ldata-rsltsts', q);
    let leap_standings: any[] = (Object.keys(leagueDriverStats?.[season_id] || {}) || [])
        .map((cid: any) => leagueDriverStats[season_id][cid]).map((driver: any) => {
            return {
                driver_id: driver.cust_id,
                leap_points: driver.power_points
            }
        }).sort((a: any, b: any) => b.leap_points - a.leap_points);

    q = {
        type: 'membersData', namespace: 'ldata-irweb', league: league_id, season: season_id
    };
    let membersData = await getDocument('ldata-irweb', q);
    let membersMap: any = {};
    for (let member of (membersData?.members || [])) {
        membersMap[member.cust_id] = member;
    }

    for (let i = 0; i < leap_standings.length; ++i) {
        let m = membersMap[leap_standings[i].driver_id] || {};
        leap_standings[i]["ranking"] = i + 1;
        leap_standings[i]["name"] = m.display_name;
        leap_standings[i]["club_id"] = m.club_id;
        leap_standings[i]["club_name"] = m.club_name;
    }

    q = {
        type: 'leagueSeasons', namespace: 'ldata-irweb',
        league: league_id
    };
    let leagueSeasons = await getDocument('ldata-irweb', q);
    let other_seasons = leagueSeasons.seasons?.map((s: any) => {
        return {
            season_id: s.season_id,
            season_name: s.season_name
        };
    }).sort((a: any, b: any) => b.season_id - a.season_id);

    let other_leagues = leagueSchedule.leagues.map((l: any) => {
        return {
            league_id: l.league_id,
            league_name: l.name
        };
    });

    return { metadata, leap_standings, other_seasons, other_leagues };
}