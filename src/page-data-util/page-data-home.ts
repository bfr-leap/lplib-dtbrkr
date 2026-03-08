import { getActiveLeagueSchedule } from '../lib-usrcfg/active-league-schedule';
import { getDocument } from '../ftchdata';
import { defLgSeasSubCtx } from './page-data-util';

export async function getHomePageData(query: { [name: string]: string }): Promise<any> {
    let ctx = await defLgSeasSubCtx(query);

    let league_id: string = ctx['league_id']?.toString() || '';
    let season_id: string = ctx['season_id']?.toString() || '';

    let leagueSchedule = await getActiveLeagueSchedule(false);

    let leagueFromSchedule = leagueSchedule.leagues?.filter((l: any) => league_id === l.league_id.toString())[0] || {};
    let seasonFromSchedule = leagueFromSchedule.seasons?.filter((season: any) => season_id === season.season_id.toString())[0] || {};

    let now = Date.now();

    let metadata = {
        league_name: leagueFromSchedule?.name || 'League Name not Found',
        league_id: league_id,
        season_name: seasonFromSchedule?.comment || 'Season Name not Found',
        season_id: season_id
    }

    let q: any = {
        type: 'trackDisplayInfo', namespace: 'ldata-usrcfg'
    };
    let trackDisplay = await getDocument('ldata-usrcfg', q);

    let future_events = (seasonFromSchedule.events
        ?.filter((ev: any) => now < new Date(ev.time).getTime()) || [])
        .map((e: any) => {
            return {
                time: e.time || '',
                track_id: e.track_id?.toString() || '',
                track_name: trackDisplay?.[e.track_id]?.display || 'Track Name not Found'
            };
        });

    q = {
        type: 'leagueSeasonSessions', namespace: 'ldata-irweb',
        league: league_id, season: season_id
    };
    let leagueSeasonSessions = await getDocument('ldata-irweb', q);

    let past_events = leagueSeasonSessions?.sessions?.map((s: any) => {
        return {
            time: s.launch_at,
            subsession_name: `${s.track.track_name} - ${s.cars[0].car_name}`,
            track_name: s.track.track_name,
            track_id: s.track.track_id.toString(),
            winner_id: s.winner_id,
            winner_name: s.winner_name,
        };
    });

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

    q = {
        type: 'leagueDriverStats', namespace: 'ldata-rsltsts', league: league_id
    };
    let leagueDriverStats = await getDocument('ldata-rsltsts', q);
    let top_3_leap_standings: any[] = (Object.keys(leagueDriverStats?.[season_id] || {}) || [])
        .map((cid: any) => leagueDriverStats[season_id][cid]).map((driver: any) => {
            return {
                driver_id: driver.cust_id,
                leap_points: driver.power_points
            }
        }).sort((a: any, b: any) => b.leap_points - a.leap_points);

    top_3_leap_standings = [top_3_leap_standings[0], top_3_leap_standings[1], top_3_leap_standings[2]];

    let memberDataPromises = [];
    for (let standing of top_3_leap_standings) {
        q = {
            type: 'singleMemberData', namespace: 'ldata-rsltsts', driver: standing.driver_id
        };

        memberDataPromises.push(getDocument('ldata-rsltsts', q));
    }
    let memberData = await Promise.all(memberDataPromises);

    for (let i = 0; i < top_3_leap_standings.length; ++i) {
        top_3_leap_standings[i]["ranking"] = i + 1;
        top_3_leap_standings[i]["name"] = memberData[i].display_name;
        top_3_leap_standings[i]["club_id"] = memberData[i].club_id;
        top_3_leap_standings[i]["club_name"] = memberData[i].club_name;
    }

    return { metadata, past_events, future_events, top_3_leap_standings, other_seasons, other_leagues };
}