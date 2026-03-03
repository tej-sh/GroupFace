import BackgroundService from 'react-native-background-actions';
import { Platform } from 'react-native';
import { insertInPhotos } from './database/photosDb';
import { processPhoto } from './ml/FaceProcessing';
import { initializeDatabase } from './database/DatabaseInit';

// ------- progress listener -------
type ProgressListener = (done: number, total: number) => void;
let _listener: ProgressListener | null = null;

export function onGroupingProgress(cb: ProgressListener): () => void {
    _listener = cb;
    return () => { _listener = null; };
}

// ------- db reference -------
// Stored here so the background task reuses the caller's existing connection.
// Never call openDb() inside the task — two connections = SQLite write-lock crash.
let _db: any = null;

// ------- helpers -------
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function getPacingConfig(): { baseDelay: number; gcPause: number; gcEvery: number } {
    const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
    if (api < 26) return { baseDelay: 300, gcPause: 1000, gcEvery: 8 };
    if (api < 30) return { baseDelay: 50,  gcPause: 500,  gcEvery: 15 };
    return             { baseDelay: 0,   gcPause: 300,  gcEvery: 25 };
}

// ------- background task -------
const groupingTask = async (taskData: any) => {
    const { uris } = taskData as { uris: string[] };
    const total = uris.length;
    const { baseDelay, gcPause, gcEvery } = getPacingConfig();

    if (!_db) return;

    await initializeDatabase(_db);

    for (let i = 0; i < total; i++) {
        if (!BackgroundService.isRunning()) break;

        try {
            const photoId = await insertInPhotos(_db, uris[i]);
            if (photoId) {
                await processPhoto(_db, uris[i], photoId);
            }
        } catch {
            // skip broken photos
        }

        const done = i + 1;
        _listener?.(done, total);

        await BackgroundService.updateNotification({
            taskDesc: `${done} of ${total} photos processed`,
            progressBar: { max: total, value: done, indeterminate: false },
        });

        if (baseDelay > 0) await sleep(baseDelay);

        if (done % gcEvery === 0) {
            await sleep(gcPause);
        }
    }

    _listener?.(total, total);
};

// ------- public API -------
export async function startBackgroundGrouping(db: any, uris: string[]): Promise<void> {
    _db = db;
    await BackgroundService.start(groupingTask, {
        taskName: 'GroupFace',
        taskTitle: 'Grouping photos…',
        taskDesc: `0 of ${uris.length} photos processed`,
        taskIcon: { name: 'ic_launcher', type: 'mipmap' },
        color: '#3b82f6',
        linkingURI: 'groupface://home',
        parameters: { uris },
        progressBar: { max: uris.length, value: 0, indeterminate: false },
    });
}

export async function stopBackgroundGrouping(): Promise<void> {
    await BackgroundService.stop();
}

export function isGroupingRunning(): boolean {
    return BackgroundService.isRunning();
}
