import { featureMiddleware } from './feature-middleware';

describe('feature-middleware', () => {
    let unlistedUser = 'unlisted';
    test('Single Released Feature', async () => {
        let e = await featureMiddleware(
            ['fully_released_feature'],
            unlistedUser,
            () => {
                return 'got it';
            }
        );

        expect(e).toEqual('got it');
    }, 60000);

    test('Single Unreleased Feature', async () => {
        let e = await featureMiddleware(
            ['unreleased_feature'],
            unlistedUser,
            () => {
                return 'got it';
            }
        );

        expect(e).toEqual(undefined);
    }, 60000);

    test('Multiple Released Features', async () => {
        let e = await featureMiddleware(
            ['fully_released_feature', 'fully_released_feature_2'],
            unlistedUser,
            () => {
                return 'got it';
            }
        );

        expect(e).toEqual('got it');
    }, 60000);

    test('Multiple Features not All Released', async () => {
        let e = await featureMiddleware(
            ['unreleased_feature', 'fully_released_feature_2'],
            unlistedUser,
            () => {
                return 'got it';
            }
        );

        expect(e).toEqual(undefined);

        e = await featureMiddleware(
            ['fully_released_feature_2', 'unreleased_feature'],
            unlistedUser,
            () => {
                return 'got it';
            }
        );

        expect(e).toEqual(undefined);
    }, 60000);
});
