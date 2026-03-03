import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { openDb, initializeDatabase } from './src/database/DatabaseInit';
import BottomTabs from './src/Navigation/BottomTabs';
import { InsertPhotoScreen } from './tabs/InsertPhotoScreen';
import { PhotoShowcase } from './tabs/photoShowcase';

const db = openDb();
initializeDatabase(db).catch(e => console.error('DB init failed:', e));

const Stack = createNativeStackNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={BottomTabs} />
            <Stack.Screen name="InsertPhoto" component={InsertPhotoScreen} />
            <Stack.Screen name="PhotoShowcase" component={PhotoShowcase} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

export default App;
