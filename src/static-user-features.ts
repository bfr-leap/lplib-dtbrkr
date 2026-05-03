export const USER_FEATURES = {
    appFeatures: [
        {
            display_name: 'league_cdr_admin',
            release_to_all: false,
            release_to_some: true,
        },
        {
            display_name: 'unreleased_feature',
            release_to_all: false,
            release_to_some: false,
        },
        {
            display_name: 'fully_released_feature',
            release_to_all: true,
            release_to_some: false,
        },
        {
            display_name: 'fully_released_feature_2',
            release_to_all: true,
            release_to_some: true,
        },
        {
            display_name: 'fully_released_feature_3',
            release_to_all: true,
            release_to_some: true,
        },
        {
            display_name: 'global_admin',
            release_to_all: false,
            release_to_some: true,
        },
    ],
    usersAppFeatures: [
        {
            user_id: 'user_2iLpmemWDB0Q0lnePYRHo95hp4W',
            feature_name: 'league_cdr_admin',
        },
        {
            user_id: 'user_2iLpmemWDB0Q0lnePYRHo95hp4W',
            feature_name: 'global_admin',
        },
        {
            user_id: 'user_2iLpmemWDB0Q0lnePYRHo95hp4W',
            feature_name: 'unreleased_feature',
        },
        {
            user_id: 'user_2iLpmemWDB0Q0lnePYRHo95hp4W',
            feature_name: 'fully_released_feature_2',
        },
        {
            user_id: 'other_user',
            feature_name: 'league_cdr_admin',
        },
        {
            user_id: 'other_user',
            feature_name: 'unreleased_feature',
        },
        {
            user_id: 'other_user',
            feature_name: 'fully_released_feature',
        },
        {
            user_id: 'other_user',
            feature_name: 'fully_released_feature_2',
        },
    ],
    userFeatures: {
        user_2iLpmemWDB0Q0lnePYRHo95hp4W: [
            'fully_released_feature',
            'fully_released_feature_2',
            'fully_released_feature_3',
            'global_admin',
            'league_cdr_admin',
        ],
        user_unlisted: [
            'fully_released_feature',
            'fully_released_feature_2',
            'fully_released_feature_3',
        ],
    },
};
