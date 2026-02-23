export function cleanPhotosTable(db:any){
    db.transaction((txn:any)=>{
        txn.executeSql(
            `
                DELETE FROM photos
            `,
            [],
            (txn:any)=>{
                console.log("photos table is clean")
                txn.executeSql(`DELETE FROM sqlite_sequence WHERE name='photos';`,
                    [],
                    (txn:any)=>{console.log("photo id reset successfull")},
                    (error:any)=>{console.log("error while reseting  photo id")+error}
                )

            },
            (error:any)=>{
                console.log("unable to delete photos no changes made")
                console.log(error)
            }
        )

    })

}
export function cleanFacesTable(db:any){
    db.transaction((txn:any)=>{
        txn.executeSql(
            `
                DELETE FROM faces
            `,
            [],
            (txn:any)=>{
                console.log("faces table is clean")
                txn.executeSql(`DELETE FROM sqlite_sequence WHERE name='faces';`,
                    [],
                    (txn:any)=>{console.log("face id reset successfull")},
                    (error:any)=>{console.log("error while reseting face id")+error}
                )

            },
            (error:any)=>{
                console.log("unable to delete faces no changes made")
                console.log(error)
            }
        )

    })
    
}

export function cleanEntireDatabase(db:any){
    try{
        cleanPhotosTable(db)
        cleanFacesTable(db)
        console.log("cleaned the database")
    }
    catch(error:any){
        console.log("Error while cleaning database")
        console.log(error)
    }
}