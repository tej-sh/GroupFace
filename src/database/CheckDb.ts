export function checkPhotos(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `
                SELECT * FROM photos
            `,
            [],
            (txn: any, res: any) => {
                const row = []
                console.log("displaying photos")
                console.log("photos:", res.rows._array)
            },
            (error: any) => {
                console.log("error while displaying photos table")
                console.log(error)
            }
        )
    })
}
export function checkFaces(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `
                SELECT * FROM faces
            `,
            [],
            (txn: any, res: any) => {
                const row = []
                console.log("displaying faces")
                console.log("faces:", res.rows._array)
            },
            (error: any) => {
                console.log("error while displaying faces table")
                console.log(error)
            }
        )
    })
}

export function checkGroups(db: any) {
    db.transaction((txn: any) => {
        txn.executeSql(
            `
                SELECT * FROM groups
            `,
            [],
            (txn: any, res: any) => {
                const row = []
                console.log("displaying groups")
                console.log("groups:", res.rows._array)
            },
            (error: any) => {
                console.log("error while displaying groups table")
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

        console.log("displayed both tables")
    }
    catch (error: any) {
        console.log("error while displaying tables")
        console.log(error)
    }

}