import { launchImageLibrary } from "react-native-image-picker";

export function insertInPhotos(db:any,uri:string): Promise<number | null>{
    return new Promise((resolve,reject)=>{
        db.transaction((txn:any)=>{
            txn.executeSql(
                `
                    INSERT INTO photos(uri)
                    VALUES(?)
                `,
                [uri],
                (txn:any,res:any)=>{
                    console.log(` Inserted: ${uri}, ID: ${res.insertId}`);
                    resolve(res.insertId)   
                },
                (txn:any,error:any)=>{
                    if (error.message.includes('UNIQUE constraint failed')) {
                        console.log(` Duplicate skipped: ${uri}`);
                        resolve(null)     
                    }
                    else{
                        console.log(error)
                        reject(error)     
                    }
                    return true
                }
            )
        })
    })
}
//cotton picker
export async function photoPicker():Promise<string | null>{
    return new Promise((resolve)=>{
        const options:any ={
            mediaType : 'photo',
            selectionLimit:1
        }
        launchImageLibrary(options,(Response:any)=>{
            if(Response.didCancel){
                console.log("user Cancelled Pickup")
                resolve(null)
                return
            }
            if(Response.errorCode){
                console.log("error while picking the image")
                resolve(null)
                return 
            }
            const uri = Response.assets[0].uri ?? null
            resolve(uri)
        })
    })
}