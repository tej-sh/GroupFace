export function insertInPhotos(db:any,uri:string){
    db.transaction((txn:any)=>{
        txn.executeSql(
            `
                INSERT INTO photos(uri)
                VALUES(?)
            `,
            [uri],
            (txn:any,res:any)=>{
                console.log(` Inserted: ${uri}, ID: ${res.insertId}`);
            },
            (txn:any,error:any)=>{
                if (error.message.includes('UNIQUE constraint failed')) {
                    console.log(` Duplicate skipped: ${uri}`);
                    return false; 
                }
                else{
                    console.log(error)
                    return false
                }
            }
        )
    })
}