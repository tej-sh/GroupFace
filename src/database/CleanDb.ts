function runStatementsInTransaction(db: any, statements: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            const runNext = (index: number) => {
                if (index >= statements.length) {
                    resolve()
                    return
                }

                txn.executeSql(
                    statements[index],
                    [],
                    () => runNext(index + 1),
                    (_txn: any, error: any) => {
                        reject(error)
                        return true
                    }
                )
            }

            runNext(0)
        }, (error: any) => reject(error))
    })
}

// delete all photos and their faces
export async function cleanPhotosTable(db: any): Promise<void> {
    // delete faces first because they reference photos
    await runStatementsInTransaction(db, [`DELETE FROM faces`, `DELETE FROM photos`])
    console.log('photos and faces tables cleared')
}

export async function cleanFacesTable(db: any): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `DELETE FROM faces`,
                [],
                () => resolve(),
                (_txn: any, error: any) => {
                    reject(error)
                    return true
                }
            )
        }, (error: any) => reject(error))
    })
    console.log('faces table cleared')
}

export async function cleanGroupsTable(db: any): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `DELETE FROM groups`,
                [],
                () => resolve(),
                (_txn: any, error: any) => {
                    reject(error)
                    return true
                }
            )
        }, (error: any) => reject(error))
    })
    console.log('groups table cleared')
}

export async function cleanEntireDatabase(db: any): Promise<void> {
    await runStatementsInTransaction(db, [
        `DELETE FROM faces`,
        `DELETE FROM groups`,
        `DELETE FROM photos`,
    ])
    console.log('entire database cleared')
}