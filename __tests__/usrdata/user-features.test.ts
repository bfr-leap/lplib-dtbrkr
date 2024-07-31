import { userFeatures } from '../../src/usrdata';
import { USER_FEATURES } from './static-user-features';

describe('user-features', () => {
    test('Retrieve Listed User Features from DB', async () => {
        let features = await userFeatures('user_2iLpmemWDB0Q0lnePYRHo95hp4W');
        features.sort();

        expect(features).toEqual(
            USER_FEATURES.userFeatures['user_2iLpmemWDB0Q0lnePYRHo95hp4W']
        );
    }, 60000);

    test('Retrieve Unlisted User Features from DB', async () => {
        let features = await userFeatures('user_unlisted');
        features.sort();

        expect(features).toEqual(USER_FEATURES.userFeatures['user_unlisted']);
    }, 60000);
});
