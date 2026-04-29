jest.mock('fs');
jest.mock('fs/promises');
jest.mock('./kafka-notify', () => ({ notifyWrite: jest.fn() }));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import {
    getStartFinishChartData,
    saveStartFinishChartData,
    getCumulativeDeltaChartData,
    saveCumulativeDeltaChartData,
    saveCumulativeDeltaBestLapChartData,
    savePacePercentVsIdealLapChartData,
    savePacePercentChartData,
    getStartFinishChartDataAsync,
    saveStartFinishChartDataAsync,
    getCumulativeDeltaChartDataAsync,
    saveCumulativeDeltaChartDataAsync,
    saveCumulativeDeltaBestLapChartDataAsync,
    savePacePercentVsIdealLapChartDataAsync,
    savePacePercentChartDataAsync,
} from './ldata-chart-data-loader';

const MNT = './public/data/ldata-charts/';

beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue('{"rows":[]}');
    (stat as jest.Mock).mockResolvedValue({});
    (readFile as jest.Mock).mockResolvedValue('{"rows":[]}');
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
});

describe('startFinishChartData', () => {
    it('reads from the expected path', () => {
        getStartFinishChartData(1, 2, 3);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}startFinishChartData/1/2/3.json`,
            expect.any(Object)
        );
    });

    it('returns null on missing file', () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(getStartFinishChartData(1, 2, 3)).toBeNull();
    });

    it('writes to the expected path', () => {
        saveStartFinishChartData(1, 2, 3, { rows: [] } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}startFinishChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });
});

describe('cumulativeDeltaChartData', () => {
    it('reads from the expected path', () => {
        getCumulativeDeltaChartData(1, 2, 3);
        expect(readFileSync).toHaveBeenCalledWith(
            `${MNT}cumulativeDeltaChartData/1/2/3.json`,
            expect.any(Object)
        );
    });

    it('writes to the expected path', () => {
        saveCumulativeDeltaChartData(1, 2, 3, { rows: [] } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}cumulativeDeltaChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });
});

describe('write-only chart datasets', () => {
    it('saveCumulativeDeltaBestLapChartData writes to the right path', () => {
        saveCumulativeDeltaBestLapChartData(1, 2, 3, { rows: [] } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}cumulativeDeltaBestLapChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });

    it('savePacePercentVsIdealLapChartData writes to the right path', () => {
        savePacePercentVsIdealLapChartData(1, 2, 3, { rows: [] } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}pacePercentVsIdealLapChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });

    it('savePacePercentChartData writes to the right path', () => {
        savePacePercentChartData(1, 2, 3, { rows: [] } as any);
        expect(writeFileSync).toHaveBeenCalledWith(
            `${MNT}pacePercentChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });
});

describe('startFinishChartData async', () => {
    it('reads from the expected path', async () => {
        await getStartFinishChartDataAsync(1, 2, 3);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}startFinishChartData/1/2/3.json`,
            expect.any(Object)
        );
    });

    it('returns null on missing file', async () => {
        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        await expect(getStartFinishChartDataAsync(1, 2, 3)).resolves.toBeNull();
    });

    it('writes to the expected path', async () => {
        await saveStartFinishChartDataAsync(1, 2, 3, { rows: [] } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}startFinishChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });
});

describe('cumulativeDeltaChartData async', () => {
    it('reads from the expected path', async () => {
        await getCumulativeDeltaChartDataAsync(1, 2, 3);
        expect(readFile).toHaveBeenCalledWith(
            `${MNT}cumulativeDeltaChartData/1/2/3.json`,
            expect.any(Object)
        );
    });

    it('writes to the expected path', async () => {
        await saveCumulativeDeltaChartDataAsync(1, 2, 3, { rows: [] } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}cumulativeDeltaChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });
});

describe('write-only chart datasets async', () => {
    it('saveCumulativeDeltaBestLapChartDataAsync writes to the right path', async () => {
        await saveCumulativeDeltaBestLapChartDataAsync(1, 2, 3, {
            rows: [],
        } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}cumulativeDeltaBestLapChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });

    it('savePacePercentVsIdealLapChartDataAsync writes to the right path', async () => {
        await savePacePercentVsIdealLapChartDataAsync(1, 2, 3, {
            rows: [],
        } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}pacePercentVsIdealLapChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });

    it('savePacePercentChartDataAsync writes to the right path', async () => {
        await savePacePercentChartDataAsync(1, 2, 3, { rows: [] } as any);
        expect(writeFile).toHaveBeenCalledWith(
            `${MNT}pacePercentChartData/1/2/3.json`,
            '{"rows":[]}'
        );
    });
});
