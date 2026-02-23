export function insertFaces(db:any,photo_id:number,bounding_box:string,embedding:number[],group_id:number){
    db.transaction((txn:any)=>{
        txn.executeSql(
            `
                INSERT INTO faces(photo_id,bounding_box,embedding,group_id)
                VALUES(?,?,?,?)
            `,[photo_id,bounding_box,embedding,group_id],
            (txn:any,res:any)=>{
                console.log(`face inserted ${photo_id} : `+res.insertId)
                return res.insertId
            },
            (error:any)=>{
                console.log(`error while inserting face ${photo_id} `+error)
            }
        )
    })
}