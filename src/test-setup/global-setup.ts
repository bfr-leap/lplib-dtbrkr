import * as dotenv from 'dotenv';
dotenv.config();

import { seedActiveLeagueSchedule } from './seed/seed-active-league-schedule';
import { seedUserFeatures } from './seed/seed-user-features';
import { seedTrackDisplayInfo } from './seed/seed-track-display-info';
import { seedLeagueTeamsInfo } from './seed/seed-league-teams-info';
import { seedTracktalkRawMessageIngest } from './seed/seed-tracktalk-raw-message-ingest';

export default async () => {
    console.log('Initial Setup');
    await seedActiveLeagueSchedule();
    await seedUserFeatures();
    await seedTrackDisplayInfo();
    await seedLeagueTeamsInfo();
    await seedTracktalkRawMessageIngest();
};
