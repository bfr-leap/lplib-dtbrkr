import {
    writeFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    statSync,
} from 'fs';
import { writeFile, mkdir, readFile, stat } from 'fs/promises';
import { notifyWrite } from './kafka-notify';

function mountPointToDatasetId(mountPoint: string): string {
    const parts = mountPoint.split('/').filter((p) => p.length > 0);
    return parts[parts.length - 1];
}

// export function ldataWriteFileOld(obj: any, name: string, mountPoint: string) {
//     name = name.replace(/-/g, 'n');
//     const ids = name.split('.')[0].split('_');
//     const path = `${mountPoint}${ids.slice(0, -1).join('/')}/`;
//     if (!existsSync(path)) {
//         mkdirSync(path, { recursive: true });
//     }
//     let newName = ids[ids.length - 1];
//     writeFileSync(`${path}${newName}.json`, JSON.stringify(obj));
// }

// Numeric keys get the `n` prefix on negative values; string keys (e.g. the
// `sessionType` segment in `driverSessionResults/{league}/{race|sprint|quali}/
// {cust}`) pass through verbatim. Mixed keys let one helper cover both
// numeric- and string-segmented paths.
type LdataKey = number | string;

function encodeKey(k: LdataKey): string {
    return typeof k === 'number' && k < 0 ? `n${-k}` : String(k);
}

// Cheap-to-expensive equality check: stat first to compare sizes (a mismatch
// proves the contents differ without reading the file), then fall back to a
// full byte comparison only when sizes match.
function fileMatchesPayload(filePath: string, payload: string): boolean {
    let size: number | undefined;
    try {
        size = statSync(filePath).size;
    } catch {
        return false;
    }
    if (size !== Buffer.byteLength(payload)) {
        return false;
    }
    try {
        return (
            readFileSync(filePath, { encoding: 'utf8', flag: 'r' }) === payload
        );
    } catch {
        return false;
    }
}

async function fileMatchesPayloadAsync(
    filePath: string,
    payload: string
): Promise<boolean> {
    let size: number | undefined;
    try {
        size = (await stat(filePath)).size;
    } catch {
        return false;
    }
    if (size !== Buffer.byteLength(payload)) {
        return false;
    }
    try {
        return (
            (await readFile(filePath, { encoding: 'utf8', flag: 'r' })) ===
            payload
        );
    } catch {
        return false;
    }
}

export function ldataWriteFile(
    obj: any,
    mountPoint: string,
    datasetName: string,
    keys: LdataKey[]
) {
    let keyStrings = keys.map(encodeKey);
    const filePath = `${mountPoint}${datasetName}/${keyStrings.join('/')}.json`;
    const payload = JSON.stringify(obj);

    if (fileMatchesPayload(filePath, payload)) {
        return;
    }

    const dirPath = `${mountPoint}${datasetName}/${keyStrings
        .slice(0, -1)
        .join('/')}`;
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
    writeFileSync(filePath, payload);

    notifyWrite(mountPointToDatasetId(mountPoint), datasetName, keys);
}

export async function ldataWriteFileAsync(
    obj: any,
    mountPoint: string,
    datasetName: string,
    keys: LdataKey[]
): Promise<void> {
    let keyStrings = keys.map(encodeKey);
    const filePath = `${mountPoint}${datasetName}/${keyStrings.join('/')}.json`;
    const payload = JSON.stringify(obj);

    if (await fileMatchesPayloadAsync(filePath, payload)) {
        return;
    }

    const dirPath = `${mountPoint}${datasetName}/${keyStrings
        .slice(0, -1)
        .join('/')}`;
    let dirExists = true;
    try {
        await stat(dirPath);
    } catch {
        dirExists = false;
    }
    if (!dirExists) {
        await mkdir(dirPath, { recursive: true });
    }
    await writeFile(filePath, payload);

    notifyWrite(mountPointToDatasetId(mountPoint), datasetName, keys);
}

export function ldataReadFile<T>(
    mountPoint: string,
    datasetName: string,
    keys: LdataKey[]
): T | null {
    let keyStrings = keys.map(encodeKey);
    try {
        let ret: T = JSON.parse(
            readFileSync(
                `${mountPoint}${datasetName}/${keyStrings.join('/')}.json`,
                {
                    encoding: 'utf8',
                    flag: 'r',
                }
            )
        );

        return ret;
    } catch (e) {
        return null;
    }
}

export async function ldataReadFileAsync<T>(
    mountPoint: string,
    datasetName: string,
    keys: LdataKey[]
): Promise<T | null> {
    let keyStrings = keys.map(encodeKey);
    try {
        let ret: T = JSON.parse(
            await readFile(
                `${mountPoint}${datasetName}/${keyStrings.join('/')}.json`,
                {
                    encoding: 'utf8',
                    flag: 'r',
                }
            )
        );

        return ret;
    } catch (e) {
        return null;
    }
}
