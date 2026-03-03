import { StyleSheet, View, Text, Button } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { openDb } from '../src/database/DatabaseInit';
import { createPhotosTable, createGroupsTable, createFaceTable } from '../src/database/DatabaseInit';
import { displayAllTables } from '../src/database/CheckDb';
import { insertInPhotos } from '../src/database/photosDb';
import { photoPicker } from '../src/database/photosDb';
import { processPhoto } from '../src/ml/FaceProcessing';
import { cleanEntireDatabase } from '../src/database/CleanDb';

export function DatabaseFunctionality(db: any) {
    const [status, setStatus] = useState<string>('Not started yet');

    const safeAreaInsets = useSafeAreaInsets();

    const createAllTables = () => {
        createPhotosTable(db);
        createFaceTable(db);
        createGroupsTable(db);
        setStatus('Tables created');
    };

    const addPhotos = async () => {
        const uris = await photoPicker(db);
        if (!uris || uris.length === 0) {
            setStatus('No photos picked');
            return;
        }

        for (const uri of uris) {
            const photoId = await insertInPhotos(db, uri);
            if (!photoId) continue;
            await processPhoto(db, uri, photoId);
        }

        setStatus('Done processing photos');
    };

    const showDatabase = () => {
        displayAllTables(db);
        setStatus('Check the console logs');
    };

    const clearDatabase = async () => {
        await cleanEntireDatabase(db);
        setStatus('Database cleared');
    };

    return (
        <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
            <View style={styles.button}>
                <Text>{status}</Text>
                <Button title="Create Tables" onPress={createAllTables} />
                <Button title="Add Photos" onPress={addPhotos} />
                <Button title="Show Database" onPress={showDatabase} />
                <Button title="Clear Database" onPress={clearDatabase} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 20,
        alignItems: 'center',
    },
    button: {
        width: '40%',
    },
});
