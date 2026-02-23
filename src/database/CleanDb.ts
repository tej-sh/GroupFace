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
                console.log(error.message)
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

export function cleanGroupsTable(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `
                DROP TABLE IF EXISTS groups
            `,
            [],
            (txn: any) => {
                console.log("groups table is clean")
            },
            (error: any) => {
                console.log("unable to delete groups no changes made")
                console.log(error)
            }
        )
    })
}


export function cleanEntireDatabase(db: any) {
    try {
        cleanPhotosTable(db)
        cleanFacesTable(db)
        cleanGroupsTable(db)
        console.log("cleaned the database")
    }
    catch (error: any) {
        console.log("Error while cleaning database")
        console.log(error)
    }
}