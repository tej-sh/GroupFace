import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider,useSafeAreaInsets } from 'react-native-safe-area-context';

import { openDb } from './src/database/DatabaseInit';
import { createPhotosTable } from './src/database/DatabaseInit';
import { checkPhotos } from './src/database/CheckDb';
import { insertInPhotos } from './src/database/photosDb';
import { cleanPhotosTable } from './src/database/CleanDb';
import { Button,Text } from 'react-native';


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
  const safeAreaInsets = useSafeAreaInsets();
  const databaseTables = ()=>{
    createPhotosTable(db)
    insertInPhotos(db,"test1/api")
  }
  const displayDataBase = ()=>{
    checkPhotos(db)
  }
  const cleanDataBase =()=>{
    cleanPhotosTable(db)
  }

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <View style={styles.button}>
        <Button 
          title="createDataBase" 
          onPress={ databaseTables }
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
