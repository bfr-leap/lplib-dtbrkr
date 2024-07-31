import { getXataClient } from '../../src/xata';
import { USER_FEATURES } from '../usrdata/static-user-features';

export async function uploadUserFeatures() {
    console.log('uploadUserFeatures() start');
    const xata = getXataClient();

    await xata.sql`DELETE FROM "app_features" WHERE 1=1`;
    await xata.sql`DELETE FROM "users_app_features" WHERE 1=1`;

    let featureMap: { [name: string]: string } = {};

    for (let appFeature of USER_FEATURES.appFeatures) {
        let feature = await xata.db.app_features.create({
            display_name: appFeature.display_name,
            release_to_all: appFeature.release_to_all,
            release_to_some: appFeature.release_to_some,
        });

        featureMap[appFeature.display_name] = feature?.id;
    }

    for (let userAppFeature of USER_FEATURES.usersAppFeatures) {
        await xata.db.users_app_features.create({
            user_id: userAppFeature.user_id,
            feature_id: featureMap[userAppFeature.feature_name],
        });
    }

    console.log('uploadUserFeatures() done');
}
