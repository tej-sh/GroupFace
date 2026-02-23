import { launchImageLibrary } from "react-native-image-picker";
import { getEmbeddingsAndBoundingBox } from "../ml/FaceProcessing";
export async function insertInPhotos(db:any,uri:string): Promise<number | null>{
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
export async function photoPicker(db:any):Promise<string | null>{
    return new Promise((resolve)=>{
        const options:any ={
            mediaType : 'photo',
            selectionLimit:0
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
            const uris = Response.assets.map((asset: any) => asset.uri);
            console.log(uris)
            resolve(uris)
            
            // const photo_id = await insertInPhotos(db, uri)
            // if (!photo_id) return
            // getEmbeddingsAndBoundingBox(db, uri, photo_id)
        })
    })
}