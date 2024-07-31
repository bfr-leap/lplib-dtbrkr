import { userFeatures } from './usrdata';

export async function featureMiddleware(
    requiredFeatures: string[],
    userID: string,
    next: () => void
): Promise<any> {
    let features = await userFeatures(userID);

    for (let requiredFeature of requiredFeatures) {
        if (features.indexOf(requiredFeature) < 0) {
            return undefined;
        }
    }

    return await next();
}
