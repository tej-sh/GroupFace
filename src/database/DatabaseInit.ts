import SQLite from 'react-native-sqlite-2'

export function openDb() {
    const db = SQLite.openDatabase('GroupFaceDatabase.db', '1.0', 'GroupFaceDb', 1)
    console.log('database opened')
    return db
}

function runSql(db: any, sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                sql,
                [],
                () => resolve(),
                (_txn: any, error: any) => {
                    reject(error)
                    return true
                }
            )
        })
    })
}

export async function createPhotosTable(db: any): Promise<void> {
    await runSql(
        db,
        `CREATE TABLE IF NOT EXISTS photos(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uri TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    )
    console.log('photos table ready')
}

export async function createFaceTable(db: any): Promise<void> {
    await runSql(
        db,
        `CREATE TABLE IF NOT EXISTS faces(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id INTEGER NOT NULL,
            bounding_box TEXT NOT NULL,
            embedding BLOB,
            group_id INTEGER,
            quality_score REAL DEFAULT 0,
            FOREIGN KEY(photo_id) REFERENCES photos(id)
        )`
    )
    console.log('faces table ready')
}

export async function createGroupsTable(db: any): Promise<void> {
    console.log('creating groups table...')
    await runSql(
        db,
        `CREATE TABLE IF NOT EXISTS groups(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT,
            email TEXT,
            phone TEXT,
            reference_embedding TEXT
        )`
    )
    console.log('groups table ready')
}

// add the phone column to groups for older databases that dont have it yet
// if the column already exists sqlite will throw an error and we just ignore it
export async function migrateDatabase(db: any): Promise<void> {
    return new Promise((resolve) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `ALTER TABLE groups ADD COLUMN phone TEXT`,
                [],
                () => resolve(), // added the column
                () => { resolve(); return false; } // already exists, thats fine
            )
        })
    })
}

export async function initializeDatabase(db?: any): Promise<void> {
    const instance = db ?? openDb()
    await createPhotosTable(instance)
    await createFaceTable(instance)
    await createGroupsTable(instance)
    await migrateDatabase(instance)
}