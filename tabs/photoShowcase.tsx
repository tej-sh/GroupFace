import {
    View, Text, Pressable, FlatList, Image, Alert, Modal,
    TextInput, TouchableOpacity, PermissionsAndroid, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { getPhotoFromPhotoId } from '../src/database/photosDb';
import { openDb } from '../src/database/DatabaseInit';
import { getFaceDataByGroupId, deleteFaceById } from '../src/database/FacesDb';
import { getGroupById, updateGroupLabel, updateGroupPhone } from '../src/database/groupsDb';
import { ArrowLeftIcon, PaperAirplaneIcon, PencilIcon, CheckIcon, TrashIcon } from 'react-native-heroicons/outline';
import { shareImagesToApp, APPS } from '../src/native/DirectShare';
import Contacts from 'react-native-contacts';

type PhotoEntry = { uri: string; faceId: number };

export function PhotoShowcase() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const groupId = route.params?.groupId;
    const db = useRef(openDb()).current;

    const [photos, setPhotos] = useState<PhotoEntry[]>([]);

    const [sending, setSending] = useState(false);

    const [groupLabel, setGroupLabel] = useState<string | null>(null);

    const [phone, setPhone] = useState<string | null>(null);

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [savingName, setSavingName] = useState(false);

    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleting, setDeleting] = useState(false);

    const [showSendModal, setShowSendModal] = useState(false);
    const [tempPhone, setTempPhone] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);

    const [contactSearch, setContactSearch] = useState('');
    const [contactResults, setContactResults] = useState<{ name: string; phone: string }[]>([]);
    const [contactsPermission, setContactsPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

    const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

    const displayName = groupLabel ?? `Group ${groupId}`;

    useEffect(() => {
        const load = async () => {
            if (!groupId) return;
            try {
                // load all faces for this group
                const faces = await getFaceDataByGroupId(db, groupId);

                // for each face, get the photo uri
                const entries: PhotoEntry[] = [];
                for (const face of faces) {
                    const uri = await getPhotoFromPhotoId(db, face.photo_id);
                    if (uri) entries.push({ uri, faceId: face.id });
                }
                setPhotos(entries);

                // load the group label and phone
                const group = await getGroupById(db, groupId);
                if (group) {
                    setGroupLabel(group.label ?? null);
                    setPhone(group.phone ?? null);
                    setNameInput(group.label ?? '');
                }
            } catch (e) {
                console.log('error loading showcase:', e);
            }
        };
        load();
    }, [groupId]);

    const saveName = async () => {
        if (!nameInput.trim()) return;
        setSavingName(true);
        try {
            await updateGroupLabel(db, groupId, nameInput.trim());
            setGroupLabel(nameInput.trim());
            setEditingName(false);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not save name.');
        } finally {
            setSavingName(false);
        }
    };

    const toggleSelect = (faceId: number) => {
        setSelectedIds(prev => {
            const updated = new Set(prev);
            updated.has(faceId) ? updated.delete(faceId) : updated.add(faceId);
            return updated;
        });
    };

    const cancelSelect = () => {
        setIsSelecting(false);
        setSelectedIds(new Set());
    };

    const deleteSelected = () => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            'Remove photos',
            `Remove ${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''} from this group?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            for (const faceId of selectedIds) {
                                await deleteFaceById(db, faceId);
                            }
                            setPhotos(prev => prev.filter(p => !selectedIds.has(p.faceId)));
                            cancelSelect();
                        } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Could not remove.');
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    // search the phone contacts by name
    const searchContacts = async (query: string) => {
        setContactSearch(query);
        if (!query.trim()) {
            setContactResults([]);
            return;
        }

        try {
            if (contactsPermission === 'denied') return;

            // ask for permission if we havent yet
            if (contactsPermission !== 'granted') {
                if (Platform.OS === 'android') {
                    const res = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
                    );
                    if (res !== PermissionsAndroid.RESULTS.GRANTED) {
                        setContactsPermission('denied');
                        return;
                    }
                }
                setContactsPermission('granted');
            }

            const contacts = await Contacts.getContactsMatchingString(query);
            const results: { name: string; phone: string }[] = [];

            for (const contact of contacts) {
                const fullName = [contact.givenName, contact.familyName].filter(Boolean).join(' ');
                for (const pn of contact.phoneNumbers ?? []) {
                    const digits = pn.number.replace(/\D/g, '');
                    if (digits) results.push({ name: fullName || pn.number, phone: digits });
                }
            }

            // only show top 8 results
            setContactResults(results.slice(0, 8));
        } catch {
            setContactResults([]);
        }
    };

    // send all photos to whatsapp
    const sendViaWhatsApp = async (number: string) => {
        const uniqueUris = [...new Set(photos.map(p => p.uri))];
        if (uniqueUris.length === 0) {
            Alert.alert('No photos', 'This group has no photos.');
            return;
        }
        setSending(true);
        try {
            await shareImagesToApp(uniqueUris, APPS.WHATSAPP, number);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not send.');
        } finally {
            setSending(false);
        }
    };

    // save the phone number and then send
    const savePhoneAndSend = async () => {
        if (!tempPhone.trim()) {
            Alert.alert('Required', 'Enter a phone number.');
            return;
        }
        setSavingPhone(true);
        try {
            await updateGroupPhone(db, groupId, tempPhone.trim());
            setPhone(tempPhone.trim());
            setShowSendModal(false);
            await sendViaWhatsApp(tempPhone.trim());
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not save.');
        } finally {
            setSavingPhone(false);
        }
    };

    // how many unique photos are in this group
    const uniqueCount = new Set(photos.map(p => p.uri)).size;

    return (
        <View className="flex-1 bg-darkBackground" style={{ paddingTop: insets.top }}>

            {/* header row */}
            <View className="px-2 pt-1 pb-2 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 gap-1">
                    {/* back button */}
                    <Pressable onPress={() => navigation.goBack()} className="p-2">
                        <ArrowLeftIcon color="white" size={22} />
                    </Pressable>

                    {/* group name - either editing or displaying */}
                    {editingName ? (
                        <View className="flex-row items-center flex-1 gap-1.5">
                            <TextInput
                                value={nameInput}
                                onChangeText={setNameInput}
                                autoFocus
                                className="flex-1 text-white font-space text-base bg-darkTertiary rounded-lg px-2.5 py-1.5"
                                placeholder="Group name..."
                                placeholderTextColor="#5e5e5e"
                            />
                            <Pressable
                                onPress={saveName}
                                disabled={savingName}
                                className="p-1.5 bg-blue-500 rounded-lg"
                                style={{ opacity: savingName ? 0.5 : 1 }}
                            >
                                <CheckIcon color="white" size={18} />
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable
                            onPress={() => { setEditingName(true); setNameInput(groupLabel ?? ''); }}
                            className="flex-row items-center gap-1.5 flex-1"
                        >
                            <Text className="text-white font-space text-xl font-bold" numberOfLines={1}>
                                {displayName}
                            </Text>
                            <PencilIcon color="#5e5e5e" size={15} />
                        </Pressable>
                    )}
                </View>

                {/* send button (hidden in selection or name edit mode) */}
                {!isSelecting && !editingName && (
                    <Pressable
                        onPress={() => setShowSendModal(true)}
                        disabled={sending}
                        className="flex-row items-center bg-blue-500 px-3.5 py-2 rounded-xl ml-2"
                        style={{ opacity: sending ? 0.4 : 1 }}
                    >
                        <PaperAirplaneIcon color="white" size={16} />
                        <Text className="text-white font-space text-[13px] ml-1.5">
                            {sending ? '...' : 'Send'}
                        </Text>
                    </Pressable>
                )}
            </View>

            {/* photo count */}
            <Text className="text-darkSecondary font-space text-xs px-3.5 pb-1.5">
                {uniqueCount} photo{uniqueCount !== 1 ? 's' : ''}
            </Text>

            {/* photo grid */}
            <FlatList
                data={photos}
                keyExtractor={(item) => item.faceId.toString()}
                numColumns={3}
                extraData={isSelecting ? selectedIds : isSelecting}
                renderItem={({ item }) => {
                    const isSelected = selectedIds.has(item.faceId);
                    return (
                        <TouchableOpacity
                            style={{ flex: 1 / 3, aspectRatio: 1, padding: 2 }}
                            delayLongPress={200}
                            onLongPress={() => {
                                setIsSelecting(true);
                                toggleSelect(item.faceId);
                            }}
                            onPress={() => {
                                if (isSelecting) {
                                    toggleSelect(item.faceId);
                                } else {
                                    setFullscreenUri(item.uri);
                                }
                            }}
                            activeOpacity={0.85}
                        >
                            <Image source={{ uri: item.uri }} className="w-full h-full" resizeMode="cover" />

                            {/* selection checkbox overlay */}
                            {isSelecting && (
                                <View style={{
                                    position: 'absolute', top: 6, right: 6,
                                    width: 22, height: 22, borderRadius: 11,
                                    backgroundColor: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.4)',
                                    borderWidth: 2, borderColor: 'white',
                                    justifyContent: 'center', alignItems: 'center',
                                }}>
                                    {isSelected && <Text className="text-white text-xs">✓</Text>}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View className="items-center pt-20">
                        <Text className="text-darkSecondary font-space text-sm">
                            No photos in this group
                        </Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 120 }}
            />

            {/* deletion toolbar */}
            {isSelecting && (
                <View
                    className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] flex-row justify-between items-center px-5 pt-4"
                    style={{ paddingBottom: 16 }}
                >
                    <TouchableOpacity onPress={cancelSelect}>
                        <Text className="text-white font-space text-sm">Cancel</Text>
                    </TouchableOpacity>

                    <Text className="text-white font-space text-sm">{selectedIds.size} selected</Text>

                    <Pressable
                        onPress={deleteSelected}
                        disabled={selectedIds.size === 0 || deleting}
                        className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
                        style={{
                            backgroundColor: selectedIds.size > 0 ? '#ef4444' : '#2a2a2a',
                            opacity: deleting ? 0.5 : 1,
                        }}
                    >
                        <TrashIcon color="white" size={16} />
                        <Text className="text-white font-space text-[13px]">
                            {deleting ? 'Removing...' : 'Remove'}
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* fullscreen photo viewer */}
            <Modal
                visible={!!fullscreenUri}
                transparent
                animationType="fade"
                onRequestClose={() => setFullscreenUri(null)}
                statusBarTranslucent
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <StatusBar hidden />
                    {fullscreenUri && (
                        <Image source={{ uri: fullscreenUri }} style={{ flex: 1 }} resizeMode="contain" />
                    )}
                    <Pressable
                        onPress={() => setFullscreenUri(null)}
                        style={{
                            position: 'absolute', top: insets.top + 12, right: 16,
                            backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8,
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 16, lineHeight: 18 }}>✕</Text>
                    </Pressable>
                </View>
            </Modal>

            {/* send via whatsapp modal */}
            <Modal
                visible={showSendModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSendModal(false)}
            >
                <Pressable className="flex-1 bg-black/60" onPress={() => setShowSendModal(false)}>
                    <View
                        className="absolute bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-tl-3xl rounded-tr-3xl p-6"
                        style={{ paddingBottom: 24 }}
                        onStartShouldSetResponder={() => true}
                    >
                        <Text className="text-white font-space text-lg mb-4">
                            Send {uniqueCount} photo{uniqueCount !== 1 ? 's' : ''} via WhatsApp
                        </Text>

                        {/* contact search input */}
                        <View style={{ marginBottom: 8 }}>
                            <TextInput
                                value={contactSearch}
                                onChangeText={searchContacts}
                                placeholder="Search contacts by name..."
                                placeholderTextColor="#5e5e5e"
                                className="bg-[#2a2a2a] text-white rounded-xl px-3.5 py-3 font-space text-[13px]"
                            />

                            {/* contact results dropdown */}
                            {contactResults.length > 0 && (
                                <View
                                    className="bg-[#1c1c1e] rounded-xl mt-0.5 overflow-hidden"
                                    style={{ maxHeight: 200 }}
                                >
                                    {contactResults.map((contact, i) => (
                                        <Pressable
                                            key={i}
                                            onPress={() => {
                                                setTempPhone(contact.phone);
                                                setContactSearch('');
                                                setContactResults([]);
                                                // auto set the group name if it still has the default name
                                                const isDefaultName = !groupLabel || /^[Gg]roup[\s-]?\d+$/.test(groupLabel);
                                                if (isDefaultName) {
                                                    setGroupLabel(contact.name);
                                                    setNameInput(contact.name);
                                                    updateGroupLabel(db, groupId, contact.name).catch(() => {});
                                                }
                                            }}
                                            className="flex-row justify-between items-center px-3.5 py-3"
                                            style={{
                                                borderBottomWidth: i < contactResults.length - 1 ? 1 : 0,
                                                borderBottomColor: '#2a2a2a',
                                            }}
                                        >
                                            <Text className="text-white font-space text-[13px] flex-1" numberOfLines={1}>
                                                {contact.name}
                                            </Text>
                                            <Text className="text-darkSecondary font-space text-[11px]">
                                                {contact.phone}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* show saved number or input for new number */}
                        {phone ? (
                            <View className="flex-row items-center bg-[#2a2a2a] rounded-xl px-3.5 py-3 mb-2.5 gap-2.5">
                                <Text className="text-darkSecondary font-space text-[13px] flex-1">{phone}</Text>
                                <Pressable onPress={() => { setPhone(null); setTempPhone(''); }}>
                                    <Text className="text-darkSecondary font-space text-[11px]">change</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <TextInput
                                value={tempPhone}
                                onChangeText={setTempPhone}
                                placeholder="e.g. 919123456789 (with country code)"
                                placeholderTextColor="#5e5e5e"
                                keyboardType="phone-pad"
                                className="bg-[#2a2a2a] text-white rounded-xl px-3.5 py-3 font-space text-[13px] mb-2.5"
                            />
                        )}

                        {/* send button */}
                        <Pressable
                            onPress={() =>
                                phone
                                    ? (setShowSendModal(false), sendViaWhatsApp(phone))
                                    : savePhoneAndSend()
                            }
                            disabled={savingPhone || sending}
                            className="bg-green-500 rounded-xl p-3.5 items-center"
                            style={{ opacity: (savingPhone || sending) ? 0.5 : 1 }}
                        >
                            <Text className="text-white font-space text-[15px]">
                                {(savingPhone || sending) ? 'Sending...' : 'Send via WhatsApp'}
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}
