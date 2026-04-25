import * as dotenv from 'dotenv';
dotenv.config();

import { uploadActiveLeagueSchedule } from './xatautl/ul-active-league-schedule';
import { uploadUserFeatures } from './xatautl/ul-user-features';
import { uploadTrackDisplayInfo } from './xatautl/ul-track-display-info';
import { uploadLeagueTeamsInfo } from './xatautl/ul-league-teams-info';
import { uploadTracktalkRawMessageIngest } from './xatautl/ul-tracktalk-raw-message-ingest';

export default async () => {
    console.log('Initial Setup');
    await uploadActiveLeagueSchedule();
    await uploadUserFeatures();
    await uploadTrackDisplayInfo();
    await uploadLeagueTeamsInfo();
    await uploadTracktalkRawMessageIngest();
};
