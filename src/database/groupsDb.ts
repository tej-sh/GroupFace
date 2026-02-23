export interface Group {
    id: number;
    label: string | null;
    email: string | null;
    reference_embedding: string;
}

export function insertGroup(db: any, reference_embedding: string): Promise<number> {
    return new Promise((resolve, reject) => {
        db.transaction((txn: any) => {
            txn.executeSql(
                `
                    INSERT INTO groups (reference_embedding)
                    VALUES (?)
                `,
                [reference_embedding],
                (txn: any, res: any) => {
                    console.log(`Group inserted with ID: ` + res.insertId)
                    resolve(res.insertId)
                },
                (error: any) => {
                    console.error("Error inserting group", error.message)
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
                (txn: any, res: any) => {
                    const temp = [];
                    for (let i = 0; i < res.rows.length; ++i) {
                        temp.push(res.rows.item(i));
                    }
                    resolve(temp)
                },
                (error: any) => {
                    console.error("Error getting groups", error.message)
                    reject(error)
                }
            )
        })
    })
}
