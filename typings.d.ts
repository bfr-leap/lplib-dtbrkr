declare module '@xata.io/client' {
    export function buildClient(): any;
    export type BaseClientOptions = Record<string, any>;
    export type SchemaInference<T> = any;
    export type XataRecord = Record<string, any>;
}
