import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Image, Modal, PermissionsAndroid, Platform, Pressable,
    Text, TouchableOpacity, View, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { openDb } from '../src/database/DatabaseInit';
import { XMarkIcon } from 'react-native-heroicons/outline';
import {
    startBackgroundGrouping, stopBackgroundGrouping,
    isGroupingRunning, onGroupingProgress,
} from '../src/backgroundGrouping';
import { getGalleryShowAll } from '../src/settings';

// types for the list items
type HeaderRow = { type: 'header'; id: string; title: string };
type PhotoRow  = { type: 'photo';  id: string; uri: string; timestamp: number };
type Row = HeaderRow | PhotoRow;

// convert timestamp to milliseconds (some devices give it in seconds)
const toMs = (ts: number) => (ts < 1e12 ? ts * 1000 : ts);

// format a timestamp as a readable date like "Mar 2, 2026"
const dayKey = (ts: number) =>
    new Date(toMs(ts)).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });

export function HomeScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const db = useRef(openDb()).current;

    const [rows, setRows] = useState<Row[]>([]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [isSelecting, setIsSelecting] = useState(false);

    const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

    const [groupingStatus, setGroupingStatus] = useState<string>('Group');

    const [isGrouping, setIsGrouping] = useState(false);

    // Re-subscribe to progress when the user navigates back to this screen
    // while a grouping job is already running in the background.
    useFocusEffect(
        useCallback(() => {
            if (!isGroupingRunning()) return;
            setIsGrouping(true);
            const unsub = onGroupingProgress((done, total) => {
                setGroupingStatus(`${done}/${total}`);
                if (done >= total) {
                    setIsGrouping(false);
                    setGroupingStatus('Done!');
                    setTimeout(() => setGroupingStatus('Group'), 3000);
                }
            });
            return unsub;
        }, [])
    );

    useEffect(() => {
        navigation.setOptions({
            tabBarStyle: isSelecting ? { display: 'none' } : { display: 'flex' },
        });
    }, [isSelecting]);

    const loadPhotos = async () => {
        try {
            if (Platform.OS === 'android') {
                const permission = Platform.Version >= 33
                    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
                    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

                const granted = await PermissionsAndroid.request(permission, {
                    title: 'Permission to access photos',
                    message: 'This app needs access to your photos to display them.',
                    buttonPositive: 'OK',
                });

                if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
            }

            const showAll = await getGalleryShowAll();
            console.log('[HomeScreen] galleryShowAll =', showAll);

            const groupTypes = Platform.OS === 'android'
                ? (showAll ? 'All' : 'Album')
                : undefined;
            const groupName = (!showAll && Platform.OS === 'android') ? 'Camera' : undefined;

            // paginate until we have every photo on the device
            let allEdges: any[] = [];
            let cursor: string | undefined = undefined;
            let hasMore = true;

            while (hasMore) {
                const res: any = await CameraRoll.getPhotos({
                    first: 500,
                    assetType: 'Photos',
                    ...(groupTypes && { groupTypes }),
                    ...(groupName && { groupName }),
                    ...(cursor && { after: cursor }),
                });

                allEdges = allEdges.concat(res.edges);
                hasMore = res.page_info.has_next_page;
                cursor = res.page_info.end_cursor;
            }

            const photos: PhotoRow[] = allEdges.map((e: any) => ({
                type: 'photo',
                id: e.node.id ?? e.node.image.uri,
                uri: e.node.image.uri,
                timestamp: e.node.timestamp,
            }));

            photos.sort((a, b) => b.timestamp - a.timestamp);

            const grouped: Row[] = [];
            let lastDay = '';
            for (const photo of photos) {
                const day = dayKey(photo.timestamp);
                if (day !== lastDay) {
                    grouped.push({ type: 'header', id: 'h-' + day, title: day });
                    lastDay = day;
                }
                grouped.push(photo);
            }

            setRows(grouped);
        } catch (e) {
            console.log('error loading photos:', e);
        }
    };

    // runs on mount and every time user navigates back to this screen
    useFocusEffect(
        useCallback(() => { loadPhotos(); }, [])
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const updated = new Set(prev);
            updated.has(id) ? updated.delete(id) : updated.add(id);
            return updated;
        });
    };

    const selectAll = () => {
        const allIds = (rows.filter(r => r.type === 'photo') as PhotoRow[]).map(p => p.id);
        setSelectedIds(new Set(allIds));
    };

    const toggleSelectDay = (title: string) => {
        const dayPhotos = (rows.filter(
            r => r.type === 'photo' && dayKey((r as PhotoRow).timestamp) === title
        ) as PhotoRow[]);

        const allSelected = dayPhotos.every(p => selectedIds.has(p.id));

        setSelectedIds(prev => {
            const updated = new Set(prev);
            dayPhotos.forEach(p => allSelected ? updated.delete(p.id) : updated.add(p.id));
            return updated;
        });
    };

    const cancelSelect = () => {
        navigation.setOptions({ tabBarStyle: { display: 'flex' } });
        setIsSelecting(false);
        setSelectedIds(new Set());
    };

    const startGrouping = async () => {
        const uris = (rows.filter(
            r => r.type === 'photo' && selectedIds.has(r.id)
        ) as PhotoRow[]).map(p => p.uri);

        if (uris.length === 0) {
            Alert.alert('No photos', 'Select at least one photo first.');
            return;
        }

        if (isGroupingRunning()) {
            Alert.alert('Already running', 'A grouping job is already in progress.');
            return;
        }

        // Android 13+ (API 33) needs explicit permission to post notifications.
        // We request it here, before starting, so the user sees the dialog while
        // they're still looking at the app rather than after it goes to background.
        if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {
            await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
        }

        cancelSelect();
        setIsGrouping(true);
        setGroupingStatus(`0/${uris.length}`);

        const unsub = onGroupingProgress((done, total) => {
            setGroupingStatus(`${done}/${total}`);
            if (done >= total) {
                unsub();
                setIsGrouping(false);
                setGroupingStatus('Done!');
                setTimeout(() => setGroupingStatus('Group'), 3000);
            }
        });

        startBackgroundGrouping(db, uris).catch((e: any) => {
            unsub();
            setIsGrouping(false);
            setGroupingStatus('Group');
            Alert.alert('Error', e?.message || 'Grouping failed.');
        });
    };

    const cancelGrouping = async () => {
        await stopBackgroundGrouping();
        setIsGrouping(false);
        setGroupingStatus('Group');
    };

    return (
        <View className="flex-1 bg-darkBackground px-2" style={{ paddingTop: insets.top }}>

            <View className="px-2 py-4 flex-row items-center justify-between">
                <Text className="text-white text-4xl font-space">Photos</Text>
                {isSelecting && (
                    <TouchableOpacity onPress={selectAll}>
                        <Text style={{ color: '#3b82f6', fontFamily: 'SpaceMono', fontSize: 14 }}>
                            Select All
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Grouping progress banner — visible whenever a job is running,
                even after the user exits selection mode */}
            {isGrouping && (
                <View style={{
                    marginHorizontal: 8, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10,
                    backgroundColor: '#1a1a1a', borderRadius: 12,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <Text style={{ color: '#3b82f6', fontFamily: 'SpaceMono', fontSize: 13 }}>
                        Grouping {groupingStatus}
                    </Text>
                    <Pressable onPress={cancelGrouping} hitSlop={8}>
                        <Text style={{ color: '#ef4444', fontFamily: 'SpaceMono', fontSize: 12 }}>
                            Cancel
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* photo grid */}
            <FlashList
                data={rows}
                keyExtractor={item => item.id}
                numColumns={3}
                extraData={isSelecting ? selectedIds : isSelecting}
                overrideItemLayout={(layout, item) => {
                    // headers take the full width (span all 3 columns)
                    layout.span = item.type === 'header' ? 3 : 1;
                }}
                renderItem={({ item }) =>
                    item.type === 'header' ? (
                        <TouchableOpacity
                            onPress={() => { if (isSelecting) toggleSelectDay(item.title); }}
                            activeOpacity={isSelecting ? 0.6 : 1}
                        >
                            <View className="flex-row items-center justify-between px-2 py-3">
                                <Text className="text-gray-200 text-base font-space">{item.title}</Text>
                                {isSelecting && (
                                    <Text style={{ color: '#6366f1', fontFamily: 'SpaceMono', fontSize: 11 }}>
                                        select all
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={{ flex: 1 / 3, aspectRatio: 1, padding: 2 }}
                            delayLongPress={200}
                            onLongPress={() => {
                                navigation.setOptions({ tabBarStyle: { display: 'none' } });
                                setIsSelecting(true);
                                toggleSelect(item.id);
                            }}
                            onPress={() => {
                                if (isSelecting) {
                                    toggleSelect(item.id);
                                } else {
                                    setFullscreenUri(item.uri);
                                }
                            }}
                        >
                            <Image
                                source={{ uri: item.uri }}
                                style={{ width: '100%', height: '100%' }}
                            />

                            {/* selection checkbox overlay */}
                            {isSelecting && (
                                <View style={{
                                    position: 'absolute', top: 6, right: 6,
                                    width: 22, height: 22, borderRadius: 11,
                                    backgroundColor: selectedIds.has(item.id) ? '#3b82f6' : 'rgba(0,0,0,0.4)',
                                    borderWidth: 2, borderColor: 'white',
                                    justifyContent: 'center', alignItems: 'center',
                                }}>
                                    {selectedIds.has(item.id) && (
                                        <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    )
                }
            />

            {isSelecting && (
                <View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    backgroundColor: '#1a1a1a', padding: 16,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingBottom: 16,
                }}>
                    <TouchableOpacity onPress={cancelSelect}>
                        <Text className="text-white text-base font-space">Cancel</Text>
                    </TouchableOpacity>

                    <Text className="text-white text-base font-space">{selectedIds.size} selected</Text>

                    <Pressable
                        onPress={startGrouping}
                        disabled={selectedIds.size === 0 || isGrouping}
                        style={{
                            backgroundColor: selectedIds.size > 0 && !isGrouping ? '#3b82f6' : '#2a2a2a',
                            paddingHorizontal: 20, paddingVertical: 10,
                            borderRadius: 10, justifyContent: 'center', alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: 'white', fontFamily: 'SpaceMono', fontSize: 14 }}>
                            {groupingStatus}
                        </Text>
                    </Pressable>
                </View>
            )}

            <Modal
                visible={!!fullscreenUri}
                transparent
                animationType="fade"
                onRequestClose={() => setFullscreenUri(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                    <Pressable
                        style={{
                            position: 'absolute', top: insets.top + 12, right: 16, zIndex: 10,
                            padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
                        }}
                        onPress={() => setFullscreenUri(null)}
                    >
                        <XMarkIcon color="white" size={24} />
                    </Pressable>

                    {fullscreenUri && (
                        <Image
                            source={{ uri: fullscreenUri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

        </View>
    );
}
