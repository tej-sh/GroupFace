export function insertFaces(
    db: any,
    photo_id: number,
    bounding_box: string,
    embedding: string,
    group_id: number,
    quality_score: number = 0
): Promise<number | null> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `INSERT INTO faces(photo_id, bounding_box, embedding, group_id, quality_score)
                 VALUES(?, ?, ?, ?, ?)`,
                [photo_id, bounding_box, embedding, group_id, quality_score],
                (_txn: any, res: any) => {
                    console.log(`face inserted for photo ${photo_id}, face id: ${res.insertId}`)
                    resolve(res.insertId)
                },
                (error: any) => {
                    console.log(`could not insert face for photo ${photo_id}:`, error.message)
                    reject(error)
                }
            )
        })
    })
}

export function deleteFaceById(db: any, faceId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `DELETE FROM faces WHERE id = ?`,
                [faceId],
                () => resolve(),
                (error: any) => { reject(error); return true }
            )
        })
    })
}

export function getFaceDataByGroupId(db: any, groupId: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `SELECT * FROM faces WHERE group_id = ?`,
                [groupId],
                (_txn: any, res: any) => {
                    const faces = []
                    for (let i = 0; i < res.rows.length; i++) {
                        faces.push(res.rows.item(i))
                    }
                    resolve(faces)
                },
                (error: any) => {
                    console.log(`could not load faces for group ${groupId}:`, error.message)
                    reject(error)
                }
            )
        })
    })
}

// get a summary for every group in one single query
// this is faster than doing separate queries for each group
// returns: group info + the best face image + total face count
export function getAllGroupSummaries(db: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `SELECT
                    g.id          AS group_id,
                    g.label,
                    g.phone,
                    g.email,
                    f.id          AS face_id,
                    f.bounding_box,
                    f.quality_score,
                    p.uri         AS image_uri,
                    (SELECT COUNT(*) FROM faces WHERE group_id = g.id) AS face_count
                FROM groups g
                LEFT JOIN faces f ON f.id = (
                    SELECT id FROM faces
                    WHERE group_id = g.id
                    ORDER BY quality_score DESC
                    LIMIT 1
                )
                LEFT JOIN photos p ON p.id = f.photo_id`,
                [],
                (_txn: any, res: any) => {
                    const summaries: any[] = []
                    for (let i = 0; i < res.rows.length; i++) {
                        summaries.push(res.rows.item(i))
                    }
                    resolve(summaries)
                },
                (_txn: any, error: any) => {
                    console.log('could not load group summaries:', error?.message ?? JSON.stringify(error))
                    reject(error)
                    return true
                }
            )
        })
    })
}

export function getBestFaceByGroupId(db: any, groupId: number): Promise<any | null> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `SELECT * FROM faces WHERE group_id = ? ORDER BY quality_score DESC LIMIT 1`,
                [groupId],
                (_txn: any, res: any) => {
                    if (res.rows.length > 0) {
                        resolve(res.rows.item(0))
                    } else {
                        resolve(null)
                    }
                },
                (error: any) => {
                    console.log(`could not get best face for group ${groupId}:`, error.message)
                    reject(error)
                }
            )
        })
    })
}