import { getDb, sql, executeInsert } from '../../src/db';
import { USER_FEATURES } from '../../src/static-user-features';

export async function seedUserFeatures() {
    console.log('seedUserFeatures() start');

    const db = getDb();

    db.exec(`DELETE FROM "app_features"`);
    db.exec(`DELETE FROM "users_app_features"`);

    const featureMap: { [name: string]: number } = {};

    for (let appFeature of USER_FEATURES.appFeatures) {
        const featureId = executeInsert(
            `INSERT INTO app_features (display_name, release_to_all, release_to_some)
             VALUES (?, ?, ?)`,
            [
                appFeature.display_name,
                appFeature.release_to_all ? 1 : 0,
                appFeature.release_to_some ? 1 : 0,
            ]
        );

        featureMap[appFeature.display_name] = featureId;
    }

    for (let userAppFeature of USER_FEATURES.usersAppFeatures) {
        await sql`
            INSERT INTO users_app_features (user_id, feature_id)
            VALUES (${userAppFeature.user_id}, ${featureMap[userAppFeature.feature_name]})`;
    }

    console.log('seedUserFeatures() done');
}
