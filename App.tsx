import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { openDb } from './src/database/DatabaseInit';
import { createPhotosTable } from './src/database/DatabaseInit';
import { checkPhotos } from './src/database/CheckDb';
import { insertInPhotos } from './src/database/photosDb';
import { cleanPhotosTable } from './src/database/CleanDb';
import { Button,Text } from 'react-native';
import { useEffect } from 'react';
import { photoPicker } from './src/database/photosDb';

const db = openDb()

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [ photos ,setPhotos ] = useState<any[]>([])
  const [ status ,setStatus ] = useState<string>('NOT Started')

  const safeAreaInsets = useSafeAreaInsets();
  const databaseTables = ()=>{
    createPhotosTable(db)
    setStatus ("created database")
  }

  const addPhotos = async () =>{
    const uri = await photoPicker()
    if(!uri){
      setStatus("pick photo")
      return
    }
    insertInPhotos(db,uri)
  }


  const displayDataBase = ()=>{
    checkPhotos(db)
    setStatus("check console of database")
  }
  const cleanDataBase =()=>{
    cleanPhotosTable(db)
    setStatus("database is cleaned")
  }


  

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <View style={styles.button}>
        <Text>{status}</Text>
        <Button 
          title="add tables" 
          onPress={ databaseTables }
        />
        <Button
          title ="add photos"
          onPress={ addPhotos }
        />
        <Button
          title ="displayDataBase"
          onPress={ displayDataBase }
        />

        <Button
          title ="cleanDatabase"
          onPress={ cleanDataBase }
        />

      </View>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    display:"flex",
    justifyContent:'center',
    paddingTop: 20,      
    alignItems:"center"
  },
  button:{
    width: "40%",
  }

});


export default App;
