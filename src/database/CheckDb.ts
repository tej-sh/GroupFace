export function checkPhotos( db:any ){
    db.transaction((txn:any)=>{
        txn.executeSql(
            `
                SELECT * FROM photos
            `,
            [],
            (txn:any,res:any)=>{
                const row = []
                console.log("displaying photos")
                console.log("photos:",res.rows._array)
            },
            (error:any)=>{
                console.log("error while displaying photos table")
                console.log(error)
            }
        )
    })
}