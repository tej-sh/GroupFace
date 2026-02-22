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
                    (txn:any)=>{console.log("id reset successfull")},
                    (error:any)=>{console.log("error while reseting id")+error}
                )

            },
            (error:any)=>{
                console.log("unable to delete photos no changes made")
                console.log(error)
            }
        )

    })
}