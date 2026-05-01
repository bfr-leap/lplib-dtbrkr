export { userConfigHandler } from './usrcfg';
export { getActiveLeagueSchedule } from './lib-usrcfg/active-league-schedule';

export { userDataHandler } from './usrdata';
export { getDocument } from './ftchdata';
export { getDocument as getDataLakeDocument } from './dtlkdata';

export {
    createRawMessageIngest,
    loadUserIdsForChannel,
    deleteAllRawMessageIngest,
    getTracktalkMessagesForChannel,
    upsertDiscordUserMapping,
    loadDiscordUserMappings,
    getGuildIdForChannel,
} from './msgingest';
export { createPublication, isSubsessionPublished, createDotdPublication, isDotdPublished } from './publications';

export { adminConfigHandler } from './admcfg';

export {
    getAllRulings,
    getRulingsByDriver,
    getRulingsBySessionType,
    getStewardConfig,
    getAllStewardConfigs,
    setRaceControlChannelId,
    stewardHandler,
} from './stward';

export { getMostRecentActiveSeason, getAllSeasonIdsForLeague } from './seasons';

// ---------------------------------------------------------------------------
// Data-lake loaders (merged from lplib-ldloadutl)
// ---------------------------------------------------------------------------

export {
    getBlockedSeasons,
    getBlockedSeasonsAsync,
    getLeagueDirectory,
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
    getMembersData,
    getLeagueDirectoryAsync,
    getLeagueSeasonsAsync,
    getLeagueSeasonSessionsAsync,
    getLapChartDataAsync,
    getMembersDataAsync,
    saveLeagueSeasons,
    saveLeagueSeasonsAsync,
    saveLeagueSeasonSessions,
    saveLeagueSeasonSessionsAsync,
    saveLapChartData,
    saveLapChartDataAsync,
    saveMembersData,
    saveMembersDataAsync,
    getLeagueRoster,
    getLeagueRosterAsync,
    saveLeagueRoster,
    saveLeagueRosterAsync,
} from './ldata-loaders/iracing-scraped-data-loader';

export {
    getSimSessionResults,
    getLeagueSubsessionIndex,
    getSimsessionDriverTelemetry,
    getProcessedTelemetryManifest,
    saveProcessedTelemetryManifest,
    getSimSessionResultsAsync,
    getLeagueSubsessionIndexAsync,
    getSimsessionDriverTelemetryAsync,
    getProcessedTelemetryManifestAsync,
    saveProcessedTelemetryManifestAsync,
    getLeagueDriverStats,
    getLeagueDriverStatsAsync,
    getSingleMemberData,
    getSingleMemberDataAsync,
    getTrackInfoDirectory,
    getTrackInfoDirectoryAsync,
    saveTrackInfoDirectory,
    saveTrackInfoDirectoryAsync,
    getTrackResults,
    getTrackResultsAsync,
    saveTrackResults,
    saveTrackResultsAsync,
    getDriverSessionResults,
    getDriverSessionResultsAsync,
    saveDriverSessionResults,
    saveDriverSessionResultsAsync,
} from './ldata-loaders/iracing-derived-data-loader';

// `getActiveLeagueSchedule` is also the name of the SQL-backed accessor
// exported above from `./lib-usrcfg/active-league-schedule`. The data-lake
// version reads `ldata-usrcfg/activeLeagueSchedule.json` from disk and is
// re-exported under a disambiguated name so both surfaces stay usable.
export {
    getActiveLeagueSchedule as getActiveLeagueScheduleFromDataLake,
    getActiveLeagueScheduleAsync as getActiveLeagueScheduleFromDataLakeAsync,
} from './ldata-loaders/ldata-usrcfg-data-loader';

export {
    getTelemetrySubsessions,
    saveTelemetrySubsessions,
    getTelemetryScan,
    getTelemetrySubsessionsAsync,
    saveTelemetrySubsessionsAsync,
    getTelemetryScanAsync,
} from './ldata-loaders/ldata-irrpy-data-loader';

export {
    getReconstructedTelemetry,
    writeReconstructedTelemetry,
    getReconstructedTelemetryAsync,
    writeReconstructedTelemetryAsync,
} from './ldata-loaders/ldata-xftelem-data-loader';

export {
    getRawPositionChanges,
    getOnTrackOvertakes,
    getOnTrackPitStops,
    getOnTrackIncidents,
    getOnTrackFinishingNotes,
    saveRawPositionChanges,
    saveOnTrackOvertakes,
    saveOnTrackPitStops,
    saveOnTrackIncidents,
    saveOnTrackFinishingNotes,
    getRawPositionChangesAsync,
    getOnTrackOvertakesAsync,
    getOnTrackPitStopsAsync,
    getOnTrackIncidentsAsync,
    getOnTrackFinishingNotesAsync,
    saveRawPositionChangesAsync,
    saveOnTrackOvertakesAsync,
    saveOnTrackPitStopsAsync,
    saveOnTrackIncidentsAsync,
    saveOnTrackFinishingNotesAsync,
} from './ldata-loaders/ldata-trkevts-data-loader';

export {
    getSimsessionSummary,
    saveSimsessionSummary,
    getDotdProfile,
    saveDotdProfile,
    getDotdManifest,
    saveDotdManifest,
    getSimsessionSummaryAsync,
    saveSimsessionSummaryAsync,
    getDotdProfileAsync,
    saveDotdProfileAsync,
    getDotdManifestAsync,
    saveDotdManifestAsync,
} from './ldata-loaders/ldata-gentxt-data-loader';

export {
    getSimsessionPodcastScriptedSrc,
    saveSimsessionPodcastScriptedSrc,
    getSimsessionPodcastScriptedSrcAsync,
    saveSimsessionPodcastScriptedSrcAsync,
} from './ldata-loaders/ldata-pdcsrc-data-loader';

export {
    getStartFinishChartData,
    saveStartFinishChartData,
    getCumulativeDeltaChartData,
    saveCumulativeDeltaChartData,
    saveCumulativeDeltaBestLapChartData,
    savePacePercentVsIdealLapChartData,
    getPacePercentChartData,
    savePacePercentChartData,
    getStartFinishChartDataAsync,
    saveStartFinishChartDataAsync,
    getCumulativeDeltaChartDataAsync,
    saveCumulativeDeltaChartDataAsync,
    saveCumulativeDeltaBestLapChartDataAsync,
    savePacePercentVsIdealLapChartDataAsync,
    getPacePercentChartDataAsync,
    savePacePercentChartDataAsync,
} from './ldata-loaders/ldata-chart-data-loader';

export {
    getStewardRulings,
    saveStewardRulings,
    getAllStewardRulings,
    getStewardRulingsByLeague,
    getStewardRulingsBySeason,
    getStewardRulingsByDriver,
    getStewardRulingsAsync,
    saveStewardRulingsAsync,
    getAllStewardRulingsAsync,
    getStewardRulingsByLeagueAsync,
    getStewardRulingsBySeasonAsync,
    getStewardRulingsByDriverAsync,
} from './ldata-loaders/ldata-stward-data-loader';
