import { launchImageLibrary } from 'react-native-image-picker';

export async function insertInPhotos(db: any, uri: string): Promise<number | null> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `INSERT OR IGNORE INTO photos(uri) VALUES(?)`,
                [uri],
                (txn: any, res: any) => {
                    if (res.rowsAffected > 0) {
                        // new photo was inserted
                        console.log(`photo saved: ${uri}, id: ${res.insertId}`)
                        resolve(res.insertId)
                        return
                    }

                    // photo already exists, look up its id
                    console.log(`photo already in db, skipping: ${uri}`)
                    txn.executeSql(
                        `SELECT id FROM photos WHERE uri = ?`,
                        [uri],
                        (_: any, result: any) => {
                            if (result.rows.length > 0) {
                                resolve(result.rows.item(0).id)
                            } else {
                                resolve(null)
                            }
                        },
                        (_: any, error: any) => {
                            console.log(`could not find existing photo id for ${uri}:`, error.message || error)
                            reject(error)
                            return true
                        }
                    )
                },
                (txn: any, error: any) => {
                    console.log('error saving photo:', error)
                    reject(error)
                    return true
                }
            )
        })
    })
}

export async function photoPicker(db: any): Promise<string | null> {
    return new Promise((resolve) => {
        const options: any = {
            mediaType: 'photo',
            selectionLimit: 0, // 0 means unlimited
        }
        launchImageLibrary(options, (response: any) => {
            if (response.didCancel) {
                console.log('user cancelled photo picker')
                resolve(null)
                return
            }
            if (response.errorCode) {
                console.log('photo picker error')
                resolve(null)
                return
            }
            const uris = response.assets.map((asset: any) => asset.uri)
            console.log('picked photos:', uris)
            resolve(uris)
        })
    })
}

export async function getPhotoFromPhotoId(db: any, photo_id: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `SELECT uri FROM photos WHERE id = ?`,
                [photo_id],
                (_txn: any, res: any) => {
                    const uri = res.rows.item(0).uri
                    resolve(uri)
                },
                (_txn: any, error: any) => {
                    console.log(`could not find photo with id ${photo_id}:`, error.message)
                    reject(error)
                    return true
                }
            )
        })
    })
}