import SQLite from 'react-native-sqlite-2'

export function openDb() {
    const db = SQLite.openDatabase('GroupFaceDatabase.db', '1.0', 'GroupFaceDb', 1)
    console.log("Database has been opened")
    return db
}

export function createPhotosTable(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `
                CREATE TABLE IF NOT EXISTS photos(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uri TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
               )
            `, [],
            (txn: any) => { console.log("successfully created photos table") },
            (error: any) => { console.log("error occured while creating the photos table :" + error) }
        )
    })
}

export function createFaceTable(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `
                CREATE TABLE IF NOT EXISTS faces(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    photo_id INTEGER NOT NULL,
                    bounding_box TEXT ,
                    embedding BLOB ,
                    group_id INTEGER,
                    FOREIGN KEY(photo_id) REFERENCES photo(id)
                )
            `, [],
            () => { console.log("created face table") },
            (error: any) => { console.log("error while creating face tables :" + error) }
        )
    })
}