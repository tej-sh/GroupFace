// import React, { useEffect, useState, useCallback } from 'react';
// import { AppState } from 'react-native';
// import {
//   View,
//   FlatList,
//   Image,
//   Dimensions,
//   PermissionsAndroid,
//   Platform,
//   ActivityIndicator,
//   Text,
//   Pressable,
// } from 'react-native';
// import { useFocusEffect } from '@react-navigation/native';
// import { CameraRoll, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';

// const { width } = Dimensions.get('window');
// const ITEM_SIZE = width / 3;

// export default function GalleryScreen() {
//   const [media, setMedia] = useState<PhotoIdentifier[]>([]);
//   const [endCursor, setEndCursor] = useState<string | null>(null);
//   const [hasNextPage, setHasNextPage] = useState(true);
//   const [loading, setLoading] = useState(false);

//   const requestPermission = async () => {
//     if (Platform.OS === 'android') {
//       const permissions =
//         Platform.Version >= 33
//           ? [
//               PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
//               PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
//             ]
//           : [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE];

//       const granted = await PermissionsAndroid.requestMultiple(permissions);

//       return Object.values(granted).every(
//         r => r === PermissionsAndroid.RESULTS.GRANTED
//       );
//     }
//     return true;
//   };

//   const loadMedia = async (after?: string | null) => {
//   if (loading) return;

//   setLoading(true);

//   try {
//     const result = await CameraRoll.getPhotos({
//       first: 120,
//       after: after || undefined,
//       assetType: 'All',
//       include: ['filename', 'fileSize', 'playableDuration'],
//     });

//     if (after) {
//       setMedia(prev => {
//         const existing = new Set(prev.map(p => p.node.image.uri));
//         const filtered = result.edges.filter(
//           item => !existing.has(item.node.image.uri)
//         );
//         return [...prev, ...filtered];
//       });
//     } else {
//       setMedia(result.edges);
//     }

//     setEndCursor(result.page_info.end_cursor || null);
//     setHasNextPage(result.page_info.has_next_page);
//   } catch (err) {
//     console.log('Media load error:', err);
//   }

//   setLoading(false);
// };

//   // Initial permission + load
//  useEffect(() => {
//   const subscription = AppState.addEventListener('change', state => {
//     if (state === 'active') {
//       loadMedia(); // refresh when app comes to foreground
//     }
//   });

//   return () => {
//     subscription.remove();
//   };
// }, []);
//   // Reload when screen comes back into focus
//   useFocusEffect(
//     useCallback(() => {
//       loadMedia();
//     }, [])
//   );

//   const handleLoadMore = () => {
//     if (hasNextPage && !loading) {
//       loadMedia(endCursor);
//     }
//   };

//   const renderItem = ({ item }: { item: PhotoIdentifier }) => {
//     const isVideo = item.node.type?.startsWith('video');

//     return (
//       <Pressable
//         onPress={() => {
//           console.log('Clicked:', item.node.image.uri);
//         }}
//       >
//         <Image
//           source={{ uri: item.node.image.uri }}
//           style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
//         />
//         {isVideo && (
//           <View
//             style={{
//               position: 'absolute',
//               bottom: 5,
//               right: 5,
//             }}>
//             <Text style={{ color: 'white', fontSize: 12 }}>▶</Text>
//           </View>
//         )}
//       </Pressable>
//     );
//   };

//   return (
//     <View style={{ flex: 1 }}>
//       <FlatList
//         data={media}
//         numColumns={3}
//         keyExtractor={(item) => item.node.image.uri}
//         renderItem={renderItem}
//         onEndReached={handleLoadMore}
//         onEndReachedThreshold={0.5}
//         initialNumToRender={40}
//         windowSize={7}
//         removeClippedSubviews
//         ListFooterComponent={
//           loading ? <ActivityIndicator size="small" /> : null
//         }
//       />
//     </View>
//   );
// }