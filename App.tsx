import { StatusBar, StyleSheet, useColorScheme, View, Text } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { openDb } from './src/database/DatabaseInit';
import { createPhotosTable, createGroupsTable, createFaceTable } from './src/database/DatabaseInit';
// import { checkPhotos } from './src/database/CheckDb';
import { displayAllTables } from './src/database/CheckDb';
import { insertInPhotos } from './src/database/photosDb';
import { Button } from 'react-native';
import { useEffect } from 'react';
import { photoPicker } from './src/database/photosDb';
import { getEmbeddingsAndBoundingBox } from './src/ml/FaceProcessing';
import { cleanEntireDatabase } from './src/database/CleanDb';


const db = openDb()

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'blue' }}>
          Inline Styles Work
        </Text>
        <View className="mt-4">
          <Text className="text-lg text-red-500">
            Nativewind Classes Should Show Red
          </Text>
        </View>
      </View>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [photos, setPhotos] = useState<any[]>([])
  const [status, setStatus] = useState<string>('NOT Started')

  const safeAreaInsets = useSafeAreaInsets();
  const databaseTables = () => {
    createPhotosTable(db)
    createFaceTable(db)
    createGroupsTable(db)
    setStatus("created database")
  }

  const addPhotos = async () => {
    const uris = await photoPicker(db)
    if (!uris || uris.length === 0) {
      setStatus("pick photo")
      return
    }
    for (const uri of uris) {
      const photo_id = await insertInPhotos(db, uri)
      if (!photo_id) return
      await getEmbeddingsAndBoundingBox(db, uri, photo_id)
    }
    setStatus("finished processing images")
  }


  const displayDataBase = () => {
    displayAllTables(db)

    setStatus("check console of database")
  }
  const cleanDataBase = () => {
    cleanEntireDatabase(db)
    setStatus("database is cleaned")
  }




  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <View style={styles.button}>
        <Text>{status}</Text>
        <Button
          title="add tables"
          onPress={databaseTables}
        />
        <Button
          title="add photos"
          onPress={addPhotos}
        />
        <Button
          title="displayDataBase"
          onPress={displayDataBase}
        />

        <Button
          title="cleanDatabase"
          onPress={cleanDataBase}
        />

      </View>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    justifyContent: 'center',
    paddingTop: 20,
    alignItems: "center"
  },
  button: {
    width: "40%",
  }

});


export default App;
