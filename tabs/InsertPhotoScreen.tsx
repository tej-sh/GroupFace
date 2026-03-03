import { View, Text, Pressable, Image, FlatList } from 'react-native';
import { ArrowUpTrayIcon, ArrowLeftIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { initializeDatabase, openDb } from '../src/database/DatabaseInit';
import { insertInPhotos } from '../src/database/photosDb';
import { displayAllTables } from '../src/database/CheckDb';
import { useState } from 'react';
import { processPhoto } from '../src/ml/FaceProcessing';

// open the database once at module level so it stays open
const db = openDb();

export function InsertPhotoScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    // list of photos the user picked
    const [photosArray, setPhotosArray] = useState<string[]>([]);

    // status text shown on the upload box
    const [status, setStatus] = useState<string>('Selected Photos: 0');

    // whether we have any photos ready to group
    const [hasPhotos, setHasPhotos] = useState<boolean>(false);

    // text shown on the group button
    const [groupingStatus, setGroupingStatus] = useState<string>('Start Grouping');

    // open the photo picker so the user can choose photos
    const pickPhotos = async () => {
        const options: any = {
            mediaType: 'photo',
            selectionLimit: 0, // 0 = unlimited
        };

        launchImageLibrary(options, async (response: any) => {
            if (response.didCancel) {
                console.log('user cancelled photo picker');
                // keep any photos that were already selected
                if (photosArray.length > 0) {
                    setHasPhotos(true);
                    setStatus(`Selected Photos: ${photosArray.length}`);
                } else {
                    setHasPhotos(false);
                }
                return;
            }

            if (response.errorCode) {
                console.log('photo picker error');
                return;
            }

            const uris = response.assets.map((asset: any) => asset.uri);
            setPhotosArray(uris);
            setStatus(`Selected Photos: ${uris.length}`);
            setHasPhotos(true);
        });
    };

    // clear everything back to the initial state
    const resetEverything = () => {
        setPhotosArray([]);
        setStatus('Selected Photos: 0');
        setHasPhotos(false);
        setGroupingStatus('Start Grouping');
    };

    // run face detection and grouping on all selected photos
    const startGrouping = async () => {
        setGroupingStatus('Grouping...');

        // make sure the database tables exist
        await initializeDatabase();

        for (const uri of photosArray) {
            const photoId = await insertInPhotos(db, uri);
            if (!photoId) continue;
            await processPhoto(db, uri, photoId);
        }

        // log the db state for debugging
        displayAllTables(db);

        resetEverything();
    };

    return (
        <View className="flex-1 bg-darkBackground" style={{ paddingTop: insets.top }}>

            {/* header with back button */}
            <View className="px-4 py-4 flex-row items-center">
                <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
                    <ArrowLeftIcon color="white" size={24} />
                </Pressable>
                <Text className="text-white text-3xl font-space">Insert Photos</Text>
            </View>

            <View className="flex-1 w-full justify-center items-center">

                {/* tap to pick photos */}
                <Pressable onPress={pickPhotos}>
                    <View className="w-1/2 aspect-square bg-darkTertiary rounded-3xl flex items-center justify-center">
                        <ArrowUpTrayIcon color={'gray'} size={40} />
                        <Text className="text-darkSecondary mt-2 font-space">{status}</Text>
                    </View>
                </Pressable>

                <View className="mt-6 w-4/5 flex items-center justify-between gap-4">

                    {/* start grouping button */}
                    <Pressable
                        className="px-6 py-3 flex justify-center items-center rounded-lg"
                        style={{ backgroundColor: hasPhotos ? '#3b82f6' : '#2a2a2a' }}
                        disabled={!hasPhotos}
                        onPress={startGrouping}
                    >
                        <Text className="text-white font-space">{groupingStatus}</Text>
                    </Pressable>

                    {/* horizontal scroll of selected photo thumbnails */}
                    <FlatList
                        data={photosArray}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <View className="w-20 h-20 m-2">
                                <Image source={{ uri: item }} className="w-full h-full rounded-lg" />
                            </View>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                </View>
            </View>
        </View>
    );
}
