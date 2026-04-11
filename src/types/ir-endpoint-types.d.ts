// Ambient declaration for the `ir-endpoint-types` package (Phase 1).
//
// The real package is published separately; these declarations exist so that
// this library can be type-checked in isolation. Once `ir-endpoint-types` is
// installed as a real dependency, TypeScript will prefer the published module
// declarations over this file.

declare module 'ir-endpoint-types' {
    export interface Sanction {
        type: string;
        license_points?: number;
        reason?: string;
        details?: string;
    }

    export interface StewardRuling {
        id?: string | number;
        league_id: number;
        season_id: number;
        subsession_id?: number;
        session_type?: string;
        discord_user_id?: string;
        driver_id?: number;
        issued_at?: string;
        summary?: string;
        sanctions: Sanction[];
    }

    export interface StewardConfig {
        league_id: number;
        race_control_channel_id: string | null;
    }
}
