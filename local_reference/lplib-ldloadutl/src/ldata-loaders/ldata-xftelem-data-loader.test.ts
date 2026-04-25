jest.mock('fs');
jest.mock('fs/promises');
jest.mock('./kafka-notify', () => ({ notifyWrite: jest.fn() }));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import {
    getReconstructedTelemetry,
    writeReconstructedTelemetry,
    getReconstructedTelemetryAsync,
    writeReconstructedTelemetryAsync,
} from './ldata-xftelem-data-loader';

const MNT = './public/data/ldata-xftelem/';

beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
    (stat as jest.Mock).mockResolvedValue({});
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
});

describe('getReconstructedTelemetry', () => {
    it('encodes negative simsession numbers with n prefix', () => {
        (readFileSync as jest.Mock).mockReturnValue('{}');
        getReconstructedTelemetry(1, 2, -3);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}reconstructedTelemetry/1/2/n3.json`,
            expect.any(Object)
        );
    });

    it('returns parsed content for existing files', () => {
        (readFileSync as jest.Mock).mockReturnValue('{"x":1}');
        expect(getReconstructedTelemetry(1, 2, 0)).toEqual({ x: 1 });
    });

    it('returns null on read failure', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getReconstructedTelemetry(1, 2, 0)).toBeNull();
    });
});

describe('writeReconstructedTelemetry', () => {
    it('writes under reconstructedTelemetry with the league/subsession/sim path', () => {
        writeReconstructedTelemetry(1, 2, 0, { epochs: [] } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}reconstructedTelemetry/1/2/0.json`,
            '{"epochs":[]}'
        );
    });
});

describe('getReconstructedTelemetryAsync', () => {
    it('encodes negative simsession numbers with n prefix', async () => {
        (readFile as jest.Mock).mockResolvedValue('{}');
        await getReconstructedTelemetryAsync(1, 2, -3);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}reconstructedTelemetry/1/2/n3.json`,
            expect.any(Object)
        );
    });

    it('returns parsed content for existing files', async () => {
        (readFile as jest.Mock).mockResolvedValue('{"x":1}');
        await expect(getReconstructedTelemetryAsync(1, 2, 0)).resolves.toEqual({
            x: 1,
        });
    });

    it('returns null on read failure', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(
            getReconstructedTelemetryAsync(1, 2, 0)
        ).resolves.toBeNull();
    });
});

describe('writeReconstructedTelemetryAsync', () => {
    it('writes under reconstructedTelemetry with the league/subsession/sim path', async () => {
        await writeReconstructedTelemetryAsync(1, 2, 0, { epochs: [] } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}reconstructedTelemetry/1/2/0.json`,
            '{"epochs":[]}'
        );
    });
});
