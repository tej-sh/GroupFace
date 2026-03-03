export interface Group {
    id: number;
    label: string | null;
    email: string | null;
    phone: string | null;
    reference_embedding: string;
}

export function insertGroup(db: any, reference_embedding: string): Promise<number> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `INSERT INTO groups (reference_embedding) VALUES (?)`,
                [reference_embedding],
                (_txn: any, res: any) => {
                    console.log(`new group created with id: ${res.insertId}`)
                    resolve(res.insertId)
                },
                (error: any) => {
                    console.log('could not create group:', error.message)
                    reject(error)
                }
            )
        })
    })
}

export function getAllGroups(db: any): Promise<Group[]> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `SELECT * FROM groups`,
                [],
                (_txn: any, res: any) => {
                    const groups = []
                    for (let i = 0; i < res.rows.length; i++) {
                        groups.push(res.rows.item(i))
                    }
                    resolve(groups)
                },
                (error: any) => {
                    console.log('could not load groups:', error.message)
                    reject(error)
                }
            )
        })
    })
}

export function getGroupById(db: any, groupId: number): Promise<Group | null> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `SELECT * FROM groups WHERE id = ?`,
                [groupId],
                (_txn: any, res: any) => {
                    resolve(res.rows.length > 0 ? res.rows.item(0) : null)
                },
                (error: any) => reject(error)
            )
        })
    })
}

export function updateGroupContact(
    db: any,
    groupId: number,
    phone: string | null,
    email: string | null
): Promise<void> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `UPDATE groups SET phone = ?, email = ? WHERE id = ?`,
                [phone, email, groupId],
                () => resolve(),
                (error: any) => reject(error)
            )
        })
    })
}

export function updateGroupLabel(
    db: any,
    groupId: number,
    label: string | null
): Promise<void> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `UPDATE groups SET label = ? WHERE id = ?`,
                [label, groupId],
                () => resolve(),
                (error: any) => reject(error)
            )
        })
    })
}

export function updateGroupPhone(
    db: any,
    groupId: number,
    phone: string | null
): Promise<void> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `UPDATE groups SET phone = ? WHERE id = ?`,
                [phone, groupId],
                () => resolve(),
                (error: any) => reject(error)
            )
        })
    })
}

// delete faces first because they reference the group
export function deleteGroup(db: any, groupId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `DELETE FROM faces WHERE group_id = ?`,
                [groupId],
                () => {
                    txn.executeSql(
                        `DELETE FROM groups WHERE id = ?`,
                        [groupId],
                        () => resolve(),
                        (_: any, e: any) => { reject(e); return true }
                    )
                },
                (_: any, e: any) => { reject(e); return true }
            )
        })
    })
}

export function mergeGroupInto(db: any, sourceGroupId: number, targetGroupId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `UPDATE faces SET group_id = ? WHERE group_id = ?`,
                [targetGroupId, sourceGroupId],
                () => {
                    txn.executeSql(
                        `DELETE FROM groups WHERE id = ?`,
                        [sourceGroupId],
                        () => resolve(),
                        (_: any, e: any) => { reject(e); return true }
                    )
                },
                (_: any, e: any) => { reject(e); return true }
            )
        })
    })
}

export function groupedData(db: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `SELECT g.id as group_id, g.reference_embedding,
                        f.id as face_id, f.photo_id, f.bounding_box, f.embedding
                 FROM groups g
                 JOIN faces f ON g.id = f.group_id`,
                [],
                (_txn: any, res: any) => {
                    const rows = []
                    for (let i = 0; i < res.rows.length; i++) {
                        rows.push(res.rows.item(i))
                    }
                    resolve(rows)
                },
                (error: any) => {
                    console.log('could not load grouped data:', error.message)
                    reject(error)
                }
            )
        })
    })
}