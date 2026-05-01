jest.mock('fs');
jest.mock('fs/promises');
jest.mock('./kafka-notify', () => ({
    notifyWrite: jest.fn(),
}));

import {
    writeFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    statSync,
} from 'fs';
import { writeFile, mkdir, readFile, stat } from 'fs/promises';
import {
    ldataWriteFile,
    ldataReadFile,
    ldataWriteFileAsync,
    ldataReadFileAsync,
} from './fsutil';
import { notifyWrite } from './kafka-notify';

describe('ldataWriteFile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (existsSync as jest.Mock).mockReturnValue(true);
    });

    it('writes the file to the expected path', () => {
        ldataWriteFile(
            { foo: 1 },
            './public/data/ldata-charts/',
            'startFinishChartData',
            [1234, 75647843, 0]
        );

        expect(writeFileSync).toHaveBeenCalledWith(
            './public/data/ldata-charts/startFinishChartData/1234/75647843/0.json',
            '{"foo":1}'
        );
    });

    it('encodes negative keys with n prefix in the file path', () => {
        ldataWriteFile(
            {},
            './public/data/ldata-irrpy/',
            'telemetrySubsessions',
            [-7]
        );

        expect(writeFileSync).toHaveBeenCalledWith(
            './public/data/ldata-irrpy/telemetrySubsessions/n7.json',
            '{}'
        );
    });

    it('creates parent directories when missing', () => {
        (existsSync as jest.Mock).mockReturnValue(false);

        ldataWriteFile({}, './public/data/ldata-gentxt/', 'd', [1, 2]);

        expect(mkdirSync).toHaveBeenCalledWith(
            './public/data/ldata-gentxt/d/1',
            { recursive: true }
        );
    });

    it('derives datasetId from the mount point and passes keys through', () => {
        ldataWriteFile(
            {},
            './public/data/ldata-charts/',
            'startFinishChartData',
            [1234, 75647843, 0]
        );

        expect(notifyWrite).toHaveBeenCalledWith(
            'ldata-charts',
            'startFinishChartData',
            [1234, 75647843, 0]
        );
    });

    it('writes the file before emitting the notification', () => {
        const order: string[] = [];
        (writeFileSync as jest.Mock).mockImplementation(() =>
            order.push('write')
        );
        (notifyWrite as jest.Mock).mockImplementation(() =>
            order.push('notify')
        );

        ldataWriteFile({}, './public/data/ldata-gentxt/', 'd', [1]);

        expect(order).toEqual(['write', 'notify']);
    });

    it('skips the write and notification when contents are unchanged', () => {
        const payload = '{"foo":1}';
        (statSync as jest.Mock).mockReturnValue({
            size: Buffer.byteLength(payload),
        });
        (readFileSync as jest.Mock).mockReturnValue(payload);

        ldataWriteFile(
            { foo: 1 },
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(writeFileSync).not.toHaveBeenCalled();
        expect(notifyWrite).not.toHaveBeenCalled();
    });

    it('writes and notifies when sizes match but contents differ', () => {
        const payload = '{"foo":1}';
        (statSync as jest.Mock).mockReturnValue({
            size: Buffer.byteLength(payload),
        });
        (readFileSync as jest.Mock).mockReturnValue('{"foo":2}');

        ldataWriteFile(
            { foo: 1 },
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(writeFileSync).toHaveBeenCalled();
        expect(notifyWrite).toHaveBeenCalled();
    });

    it('skips the read when sizes differ', () => {
        (statSync as jest.Mock).mockReturnValue({ size: 1 });

        ldataWriteFile(
            { foo: 1 },
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(readFileSync).not.toHaveBeenCalled();
        expect(writeFileSync).toHaveBeenCalled();
        expect(notifyWrite).toHaveBeenCalled();
    });
});

describe('ldataReadFile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns parsed JSON for an existing file', () => {
        (readFileSync as jest.Mock).mockReturnValue('{"a":1}');

        const result = ldataReadFile<{ a: number }>(
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(result).toEqual({ a: 1 });
    });

    it('returns null when the read throws', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });

        const result = ldataReadFile('./public/data/ldata-charts/', 'd', [1]);

        expect(result).toBeNull();
    });

    it('encodes negative keys with n prefix in the read path', () => {
        (readFileSync as jest.Mock).mockReturnValue('null');

        ldataReadFile('./public/data/ldata-charts/', 'd', [-5, 10]);

        expect(readFileSync).toHaveBeenCalledWith(
            './public/data/ldata-charts/d/n5/10.json',
            expect.any(Object)
        );
    });

    it('does not invoke notifyWrite on reads', () => {
        (readFileSync as jest.Mock).mockReturnValue('{}');

        ldataReadFile('./public/data/ldata-charts/', 'd', [1]);

        expect(notifyWrite).not.toHaveBeenCalled();
    });
});

describe('ldataWriteFileAsync', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (stat as jest.Mock).mockResolvedValue({});
        (writeFile as jest.Mock).mockResolvedValue(undefined);
        (mkdir as jest.Mock).mockResolvedValue(undefined);
    });

    it('writes the file to the expected path', async () => {
        await ldataWriteFileAsync(
            { foo: 1 },
            './public/data/ldata-charts/',
            'startFinishChartData',
            [1234, 75647843, 0]
        );

        expect(writeFile).toHaveBeenCalledWith(
            './public/data/ldata-charts/startFinishChartData/1234/75647843/0.json',
            '{"foo":1}'
        );
    });

    it('encodes negative keys with n prefix in the file path', async () => {
        await ldataWriteFileAsync(
            {},
            './public/data/ldata-irrpy/',
            'telemetrySubsessions',
            [-7]
        );

        expect(writeFile).toHaveBeenCalledWith(
            './public/data/ldata-irrpy/telemetrySubsessions/n7.json',
            '{}'
        );
    });

    it('creates parent directories when missing', async () => {
        (stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));

        await ldataWriteFileAsync(
            {},
            './public/data/ldata-gentxt/',
            'd',
            [1, 2]
        );

        expect(mkdir).toHaveBeenCalledWith('./public/data/ldata-gentxt/d/1', {
            recursive: true,
        });
    });

    it('does not create parent directories when they exist', async () => {
        await ldataWriteFileAsync(
            {},
            './public/data/ldata-gentxt/',
            'd',
            [1, 2]
        );

        expect(mkdir).not.toHaveBeenCalled();
    });

    it('derives datasetId from the mount point and passes keys through', async () => {
        await ldataWriteFileAsync(
            {},
            './public/data/ldata-charts/',
            'startFinishChartData',
            [1234, 75647843, 0]
        );

        expect(notifyWrite).toHaveBeenCalledWith(
            'ldata-charts',
            'startFinishChartData',
            [1234, 75647843, 0]
        );
    });

    it('writes the file before emitting the notification', async () => {
        const order: string[] = [];
        (writeFile as jest.Mock).mockImplementation(async () =>
            order.push('write')
        );
        (notifyWrite as jest.Mock).mockImplementation(() =>
            order.push('notify')
        );

        await ldataWriteFileAsync({}, './public/data/ldata-gentxt/', 'd', [1]);

        expect(order).toEqual(['write', 'notify']);
    });

    it('skips the write and notification when contents are unchanged', async () => {
        const payload = '{"foo":1}';
        (stat as jest.Mock).mockResolvedValue({
            size: Buffer.byteLength(payload),
        });
        (readFile as jest.Mock).mockResolvedValue(payload);

        await ldataWriteFileAsync(
            { foo: 1 },
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(writeFile).not.toHaveBeenCalled();
        expect(notifyWrite).not.toHaveBeenCalled();
    });

    it('writes and notifies when sizes match but contents differ', async () => {
        const payload = '{"foo":1}';
        (stat as jest.Mock).mockResolvedValue({
            size: Buffer.byteLength(payload),
        });
        (readFile as jest.Mock).mockResolvedValue('{"foo":2}');

        await ldataWriteFileAsync(
            { foo: 1 },
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(writeFile).toHaveBeenCalled();
        expect(notifyWrite).toHaveBeenCalled();
    });

    it('skips the read when sizes differ', async () => {
        (stat as jest.Mock).mockResolvedValue({ size: 1 });

        await ldataWriteFileAsync(
            { foo: 1 },
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(readFile).not.toHaveBeenCalled();
        expect(writeFile).toHaveBeenCalled();
        expect(notifyWrite).toHaveBeenCalled();
    });
});

describe('ldataReadFileAsync', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns parsed JSON for an existing file', async () => {
        (readFile as jest.Mock).mockResolvedValue('{"a":1}');

        const result = await ldataReadFileAsync<{ a: number }>(
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(result).toEqual({ a: 1 });
    });

    it('returns null when the read rejects', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

        const result = await ldataReadFileAsync(
            './public/data/ldata-charts/',
            'd',
            [1]
        );

        expect(result).toBeNull();
    });

    it('encodes negative keys with n prefix in the read path', async () => {
        (readFile as jest.Mock).mockResolvedValue('null');

        await ldataReadFileAsync('./public/data/ldata-charts/', 'd', [-5, 10]);

        expect(readFile).toHaveBeenCalledWith(
            './public/data/ldata-charts/d/n5/10.json',
            expect.any(Object)
        );
    });

    it('does not invoke notifyWrite on reads', async () => {
        (readFile as jest.Mock).mockResolvedValue('{}');

        await ldataReadFileAsync('./public/data/ldata-charts/', 'd', [1]);

        expect(notifyWrite).not.toHaveBeenCalled();
    });
});
