export function cleanPhotosTable(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `
                DROP TABLE IF EXISTS photos
            `,
            [],
            (txn: any) => {
                console.log("photos table is clean")
            },
            (error: any) => {
                console.log("unable to delete photos no changes made")
                console.log(error)
            }
        )
    })
}

export function cleanFacesTable(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `
                DROP TABLE IF EXISTS faces
            `,
            [],
            (txn: any) => {
                console.log("faces table is clean")
            },
            (error: any) => {
                console.log("unable to delete faces no changes made")
                console.log(error)
            }
        )
    })
}

export function cleanEntireDatabase(db: any) {
    try {
        cleanPhotosTable(db)
        cleanFacesTable(db)
        console.log("cleaned the database")
    }
    catch (error: any) {
        console.log("Error while cleaning database")
        console.log(error)
    }
}