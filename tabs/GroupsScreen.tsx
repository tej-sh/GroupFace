import { View, Text, Image, FlatList, TextInput, Pressable, Alert, TouchableOpacity } from 'react-native';
import { useRef, useState, useCallback, useMemo, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import FaceThumbnailCard from './components/FaceThumbnailCard';
import { openDb } from '../src/database/DatabaseInit';
import { getAllGroupSummaries } from '../src/database/FacesDb';
import { updateGroupContact, deleteGroup, mergeGroupInto } from '../src/database/groupsDb';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpTrayIcon, ArrowsUpDownIcon, XMarkIcon } from 'react-native-heroicons/outline';

type GroupItemProps = {
    item: any;
    isSelecting: boolean;
    selected: boolean;
    groupPhotoUri: string;
    allGroupsMap: any[];
    db: any;
    onNavigate: (groupId: number) => void;
    onEnterSelect: (groupId: number) => void;
    onToggle: (groupId: number) => void;
    onContactSaved: (groupId: number, phone: string | null, email: string | null) => void;
    onLabelChanged: (groupId: number, label: string) => void;
    onDeleted: (groupId: number) => void;
};

const GroupItem = memo(({
    item, isSelecting, selected, groupPhotoUri, allGroupsMap, db,
    onNavigate, onEnterSelect, onToggle, onContactSaved, onLabelChanged, onDeleted,
}: GroupItemProps) => {
    // parse the bounding box if it is stored as a string
    let parsedBoundingBox;
    try {
        parsedBoundingBox = typeof item.bounding_box === 'string'
            ? JSON.parse(item.bounding_box)
            : item.bounding_box;
    } catch {
        parsedBoundingBox = undefined;
    }

    const otherGroups = allGroupsMap.filter(g => g.group_id !== item.group_id);

    return (
        <View style={{ flex: 1 }}>
            <FaceThumbnailCard
                imageUri={item.image_uri || groupPhotoUri}
                name={item.label ?? `Group ${item.group_id}`}
                photoCount={item.face_count ?? 0}
                boundingBox={parsedBoundingBox}
                groupId={item.group_id}
                onPress={() => isSelecting ? onToggle(item.group_id) : onNavigate(item.group_id)}
                onLongPress={() => onEnterSelect(item.group_id)}
                selected={isSelecting ? selected : undefined}
                phone={item.phone ?? null}
                db={db}
                onContactSaved={(p, e) => onContactSaved(item.group_id, p, e)}
                onLabelChanged={(label) => onLabelChanged(item.group_id, label)}
                allGroups={otherGroups}
                onDeleted={() => onDeleted(item.group_id)}
            />

            {/* invisible overlay to intercept presses in selection mode */}
            {isSelecting && (
                <Pressable
                    onPress={() => onToggle(item.group_id)}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
            )}
        </View>
    );
});

export function GroupsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const db = useRef(openDb()).current;

    const [groupSummaries, setGroupSummaries] = useState<any[]>([]);

    const groupPhotoAsset = Image.resolveAssetSource(require('../assets/images/groupPhoto.jpg'));

    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const [sortByCount, setSortByCount] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    const toggleSelect = useCallback((id: number) => {
        setSelectedIds(prev => {
            const updated = new Set(prev);
            updated.has(id) ? updated.delete(id) : updated.add(id);
            return updated;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(groupSummaries.map(g => g.group_id as number)));
    }, [groupSummaries]);

    const cancelSelect = useCallback(() => {
        navigation.setOptions({ tabBarStyle: { display: 'flex' } });
        setIsSelecting(false);
        setSelectedIds(new Set());
    }, [navigation]);

    const bulkDelete = () => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            'Delete groups',
            `Delete ${selectedIds.size} group${selectedIds.size > 1 ? 's' : ''} and all their faces? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            for (const id of selectedIds) {
                                await deleteGroup(db, id);
                            }
                            setGroupSummaries(prev => prev.filter(g => !selectedIds.has(g.group_id)));
                            cancelSelect();
                        } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Could not delete.');
                        }
                    },
                },
            ]
        );
    };

    const bulkMerge = () => {
        if (selectedIds.size < 2) {
            Alert.alert('Select at least 2 groups to merge.');
            return;
        }

        const ids = [...selectedIds];
        const targetId = ids[0];
        const targetLabel = groupSummaries.find(g => g.group_id === targetId)?.label ?? `Group ${targetId}`;

        Alert.alert(
            'Merge groups',
            `Merge ${ids.length} groups into "${targetLabel}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Merge',
                    style: 'default',
                    onPress: async () => {
                        try {
                            for (const id of ids.slice(1)) {
                                await mergeGroupInto(db, id, targetId);
                            }
                            setGroupSummaries(prev =>
                                prev.filter(g => g.group_id === targetId || !selectedIds.has(g.group_id))
                            );
                            cancelSelect();
                        } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Could not merge.');
                        }
                    },
                },
            ]
        );
    };

    // reload groups every time this screen is focused
    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                const summaries = await getAllGroupSummaries(db);
                setGroupSummaries(summaries);
            };
            load().catch(() => {});
        }, [db])
    );

    // navigate to the photo showcase for a group
    const onNavigate = useCallback((groupId: number) => {
        navigation.navigate('PhotoShowcase', { groupId });
    }, [navigation]);

    // enter selection mode and select the first group
    const onEnterSelect = useCallback((groupId: number) => {
        navigation.setOptions({ tabBarStyle: { display: 'none' } });
        setIsSelecting(true);
        setSelectedIds(prev => {
            const updated = new Set(prev);
            updated.add(groupId);
            return updated;
        });
    }, [navigation]);

    // called when a contact is saved on a group card
    // also checks if another group already has that phone and merges if so
    const onContactSaved = useCallback((groupId: number, phone: string | null, email: string | null) => {
        setGroupSummaries(prev => {
            const updated = prev.map(g =>
                g.group_id === groupId ? { ...g, phone, email } : g
            );

            // auto merge if another group shares the same phone
            if (phone) {
                const duplicates = updated.filter(g => g.group_id !== groupId && g.phone === phone);
                if (duplicates.length > 0) {
                    const dupIds = duplicates.map(d => d.group_id);
                    Promise.all(dupIds.map(id => mergeGroupInto(db, id, groupId)))
                        .then(() => setGroupSummaries(s => s.filter(g => !dupIds.includes(g.group_id))))
                        .catch(() => {});
                }
            }

            return updated;
        });
    }, [db]);

    // update the name shown on a group card without reloading
    const onLabelChanged = useCallback((groupId: number, label: string) => {
        setGroupSummaries(prev => prev.map(g => g.group_id === groupId ? { ...g, label } : g));
    }, []);

    // remove a group from the list after it is deleted
    const onDeleted = useCallback((groupId: number) => {
        setGroupSummaries(prev => prev.filter(g => g.group_id !== groupId));
    }, []);

    // build the list of groups to pass to the merge picker
    const allGroupsMap = useMemo(() => {
        return groupSummaries.map(g => {
            let bb;
            try {
                bb = g.bounding_box && g.image_uri
                    ? (typeof g.bounding_box === 'string' ? JSON.parse(g.bounding_box) : g.bounding_box)
                    : null;
            } catch { bb = null; }

            return {
                group_id: g.group_id,
                label: g.label ?? null,
                image_uri: g.image_uri ?? groupPhotoAsset.uri,
                bounding_box: bb ?? null,
            };
        });
    }, [groupSummaries]);

    // optionally sort by face count
    const sortedGroups = useMemo(() =>
        sortByCount
            ? [...groupSummaries].sort((a, b) => (b.face_count ?? 0) - (a.face_count ?? 0))
            : groupSummaries
    , [groupSummaries, sortByCount]);

    // filter by search query
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return sortedGroups;
        const q = searchQuery.toLowerCase();
        return sortedGroups.filter(g => {
            const label = (g.label ?? `Group ${g.group_id}`).toLowerCase();
            return label.includes(q);
        });
    }, [sortedGroups, searchQuery]);

    return (
        <View className="flex-1 bg-darkBackground px-0" style={{ paddingTop: insets.top }}>

            {/* header */}
            <View className="px-2 py-4 flex-row justify-between items-center">
                <View className="px-2 flex-row items-baseline gap-2">
                    <Text className="text-white font-space text-4xl mb-1" style={{ letterSpacing: -0.5 }}>
                        Groups
                    </Text>
                    {groupSummaries.length > 0 && (
                        <Text className="text-darkSecondary font-space text-sm">
                            {groupSummaries.length}
                        </Text>
                    )}
                </View>

                {isSelecting ? (
                    <TouchableOpacity onPress={selectAll}>
                        <Text style={{ color: '#3b82f6', fontFamily: 'SpaceMono', fontSize: 14 }}>
                            Select All
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {/* sort toggle button */}
                        <TouchableOpacity
                            onPress={() => setSortByCount(v => !v)}
                            style={{
                                backgroundColor: sortByCount ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.07)',
                                padding: 8, borderRadius: 10,
                                borderWidth: 1, borderColor: sortByCount ? '#3b82f6' : 'transparent',
                            }}
                        >
                            <ArrowsUpDownIcon color={sortByCount ? '#60a5fa' : '#5e5e5e'} size={18} />
                        </TouchableOpacity>

                        {/* go to insert photos screen */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('InsertPhoto')}
                            style={{ backgroundColor: 'rgba(255,255,255,0.07)', padding: 8, borderRadius: 10 }}
                        >
                            <ArrowUpTrayIcon color="#5e5e5e" size={18} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* search bar */}
            <View className="px-4 pb-3 flex-row items-center gap-2">
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search groups..."
                    placeholderTextColor="#5e5e5e"
                    className="flex-1 bg-darkTertiary text-white font-space text-sm rounded-xl px-3.5 py-2.5"
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                        <XMarkIcon color="#5e5e5e" size={18} />
                    </Pressable>
                )}
            </View>

            {/* group grid */}
            <View className="flex-1">
                <FlatList
                    data={filteredGroups}
                    numColumns={2}
                    keyExtractor={(item) => item.group_id.toString()}
                    extraData={selectedIds}
                    columnWrapperStyle={{ gap: 12, paddingHorizontal: 14 }}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    renderItem={({ item }) => (
                        <GroupItem
                            item={item}
                            isSelecting={isSelecting}
                            selected={selectedIds.has(item.group_id)}
                            groupPhotoUri={groupPhotoAsset.uri}
                            db={db}
                            allGroupsMap={allGroupsMap}
                            onNavigate={onNavigate}
                            onEnterSelect={onEnterSelect}
                            onToggle={toggleSelect}
                            onContactSaved={onContactSaved}
                            onLabelChanged={onLabelChanged}
                            onDeleted={onDeleted}
                        />
                    )}
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-36">
                            <Text className="text-darkSecondary font-space text-[16px] text-center">
                                No groups yet
                            </Text>
                            <Text
                                className="text-darkSecondary font-space text-[12px] mt-2 text-center"
                                style={{ lineHeight: 20 }}
                            >
                                {'Go to Home and long-press\nphotos to start grouping faces'}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 160, paddingTop: 10 }}
                />
            </View>

            {/* bottom toolbar for selection actions */}
            {isSelecting && (
                <View
                    className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] p-4 flex-row justify-between items-center"
                    style={{ paddingBottom: 16 }}
                >
                    <TouchableOpacity onPress={cancelSelect}>
                        <Text className="text-white font-space text-sm">Cancel</Text>
                    </TouchableOpacity>

                    <Text className="text-white font-space text-sm">{selectedIds.size} selected</Text>

                    <View className="flex-row gap-2.5">
                        <Pressable
                            onPress={bulkMerge}
                            disabled={selectedIds.size < 2}
                            className="px-4 py-2.5 rounded-xl"
                            style={{ backgroundColor: selectedIds.size >= 2 ? '#6366f1' : '#2a2a2a' }}
                        >
                            <Text className="text-white font-space text-[13px]">Merge</Text>
                        </Pressable>

                        <Pressable
                            onPress={bulkDelete}
                            disabled={selectedIds.size === 0}
                            className="px-4 py-2.5 rounded-xl"
                            style={{ backgroundColor: selectedIds.size > 0 ? '#ef4444' : '#2a2a2a' }}
                        >
                            <Text className="text-white font-space text-[13px]">Delete</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}
