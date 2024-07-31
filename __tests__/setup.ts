import * as dotenv from 'dotenv';
dotenv.config();

import { uploadActiveLeagueSchedule } from './xatautl/ul-active-league-schedule';
import { uploadUserFeatures } from './xatautl/ul-user-features';

export default async () => {
    console.log('Initial Setup');
    // await uploadActiveLeagueSchedule();
    // await uploadUserFeatures();
};
