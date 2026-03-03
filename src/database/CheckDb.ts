export function checkPhotos(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `SELECT * FROM photos`,
            [],
            (_txn: any, res: any) => {
                console.log('photos table:')
                console.log(res.rows._array)
            },
            (error: any) => {
                console.log('could not read photos table')
                console.log(error)
            }
        )
    })
}

export function checkFaces(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `SELECT * FROM faces`,
            [],
            (_txn: any, res: any) => {
                console.log('faces table:')
                console.log(res.rows._array)
            },
            (error: any) => {
                console.log('could not read faces table')
                console.log(error)
            }
        )
    })
}

export function checkGroups(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `SELECT * FROM groups`,
            [],
            (_txn: any, res: any) => {
                console.log('groups table:')
                console.log(res.rows._array)
            },
            (error: any) => {
                console.log('could not read groups table')
                console.log(error)
            }
        )
    })
}

export function displayAllTables(db: any) {
    try {
        checkPhotos(db)
        checkFaces(db)
        checkGroups(db)
        console.log('done showing all tables')
    } catch (error: any) {
        console.log('something went wrong showing tables')
        console.log(error)
    }
}
