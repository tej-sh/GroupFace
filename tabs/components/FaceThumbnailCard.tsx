import {
    View, Text, Image, Pressable, Modal, TextInput,
    Alert, ScrollView, FlatList, PermissionsAndroid, Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { EllipsisVerticalIcon, PencilIcon, CheckIcon } from 'react-native-heroicons/outline';
import Contacts from 'react-native-contacts';
import { shareImagesToApp, APPS } from '../../src/native/DirectShare';
import { updateGroupContact, updateGroupLabel, deleteGroup, mergeGroupInto } from '../../src/database/groupsDb';
import { getFaceDataByGroupId } from '../../src/database/FacesDb';
import { getPhotoFromPhotoId } from '../../src/database/photosDb';

type SendOption = 'whatsapp';

type FaceThumbnailCardProps = {
    imageUri: string;
    name: string;
    photoCount: number;
    boundingBox?: {
        left: number;
        top: number;
        width: number;
        height: number;
        imageWidth?: number;
        imageHeight?: number;
    };
    groupId?: number;
    onPress?: () => void;
    onLongPress?: () => void;
    selected?: boolean;
    phone?: string | null;
    db?: any;
    onContactSaved?: (phone: string | null, email: string | null) => void;
    onLabelChanged?: (newLabel: string) => void;
    allGroups?: {
        group_id: number;
        label: string | null;
        image_uri?: string | null;
        bounding_box?: {
            left: number; top: number; width: number; height: number;
            imageWidth?: number; imageHeight?: number;
        } | null;
    }[];
    onDeleted?: () => void;
};

export function FaceThumbnailCard({
    imageUri,
    name,
    photoCount,
    boundingBox,
    groupId,
    onPress,
    onLongPress,
    selected,
    phone: initialPhone,
    db,
    onContactSaved,
    onLabelChanged,
    allGroups,
    onDeleted,
}: FaceThumbnailCardProps) {
    const [phone, setPhone] = useState(initialPhone ?? null);

    const [showSendModal, setShowSendModal] = useState(false);

    const [activeOption, setActiveOption] = useState<SendOption | null>(null);

    const [tempInput, setTempInput] = useState('');

    const [sending, setSending] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editPhone, setEditPhone] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [showMerge, setShowMerge] = useState(false);
    const [merging, setMerging] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(name);
    const [savingName, setSavingName] = useState(false);

    const [contactSearch, setContactSearch] = useState('');
    const [contactResults, setContactResults] = useState<{ name: string; phone: string }[]>([]);
    const [contactsPermission, setContactsPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

    const openSendModal = () => {
        setActiveOption(null);
        setTempInput('');
        setShowEdit(false);
        setShowMerge(false);
        setEditingName(false);
        setNameInput(name);
        setContactSearch('');
        setContactResults([]);
        setShowSendModal(true);
    };

    const saveName = async () => {
        if (!db || !groupId || !nameInput.trim()) return;
        setSavingName(true);
        try {
            await updateGroupLabel(db, groupId, nameInput.trim());
            onLabelChanged?.(nameInput.trim());
            setEditingName(false);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not save name.');
        } finally {
            setSavingName(false);
        }
    };

    const searchContacts = async (query: string) => {
        setContactSearch(query);
        if (!query.trim()) {
            setContactResults([]);
            return;
        }

        try {
            if (contactsPermission === 'denied') {
                setContactResults([]);
                return;
            }

            // request permission if we havent yet
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

            setContactResults(results.slice(0, 8));
        } catch {
            setContactResults([]);
        }
    };

    // tap the whatsapp row:
    // if we already have a phone, send immediately
    // otherwise expand the input to enter one
    const selectOption = () => {
        if (phone) {
            setShowSendModal(false);
            executeSend('whatsapp', phone);
        } else {
            setActiveOption('whatsapp');
            setTempInput('');
        }
    };

    const saveAndSend = async () => {
        if (!tempInput.trim()) {
            Alert.alert('Required', 'Enter a phone number (e.g. 919515177758).');
            return;
        }
        if (!db || !groupId) return;

        setSending(true);
        try {
            await updateGroupContact(db, groupId, tempInput.trim(), null);
            setPhone(tempInput.trim());
            onContactSaved?.(tempInput.trim(), null);
            setShowSendModal(false);
            await executeSend('whatsapp', tempInput.trim());
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not save contact.');
        } finally {
            setSending(false);
        }
    };

    const saveContactOnly = async () => {
        if (!tempInput.trim()) {
            Alert.alert('Required', 'Enter a phone number (e.g. 919515177758).');
            return;
        }
        if (!db || !groupId) return;

        setSending(true);
        try {
            await updateGroupContact(db, groupId, tempInput.trim(), null);
            setPhone(tempInput.trim());
            onContactSaved?.(tempInput.trim(), null);
            setActiveOption(null);
            setTempInput('');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not save contact.');
        } finally {
            setSending(false);
        }
    };

    const saveEditedContact = async () => {
        if (!db || !groupId) return;
        setSavingEdit(true);
        try {
            const newPhone = editPhone.trim() || null;
            await updateGroupContact(db, groupId, newPhone, null);
            setPhone(newPhone);
            onContactSaved?.(newPhone, null);
            setShowEdit(false);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not save contact.');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete group',
            `Delete Group ${groupId} and all its faces? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!db || !groupId) return;
                        setDeleting(true);
                        try {
                            await deleteGroup(db, groupId);
                            setShowSendModal(false);
                            onDeleted?.();
                        } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Could not delete group.');
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleMerge = (targetId: number, targetLabel: string | null) => {
        Alert.alert(
            'Merge group',
            `Move all faces from Group ${groupId} into "${targetLabel ?? `Group ${targetId}`}"? Group ${groupId} will be deleted.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Merge',
                    style: 'destructive',
                    onPress: async () => {
                        if (!db || !groupId) return;
                        setMerging(true);
                        try {
                            await mergeGroupInto(db, groupId, targetId);
                            setShowSendModal(false);
                            onDeleted?.();
                        } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Could not merge groups.');
                        } finally {
                            setMerging(false);
                        }
                    },
                },
            ]
        );
    };

    const executeSend = async (option: SendOption, contact: string) => {
        if (!db || !groupId) {
            Alert.alert('Error', 'No group info.');
            return;
        }

        setSending(true);
        try {
            const faces = await getFaceDataByGroupId(db, groupId);
            const uris: string[] = [];

            for (const face of faces) {
                const uri = await getPhotoFromPhotoId(db, face.photo_id);
                if (uri) uris.push(uri);
            }

            // remove duplicate uris (same photo with multiple faces)
            const uniqueUris = [...new Set(uris)];

            if (uniqueUris.length === 0) {
                Alert.alert('No photos', 'No photos found for this group.');
                return;
            }

            await shareImagesToApp(uniqueUris, APPS.WHATSAPP, contact);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not send photos.');
        } finally {
            setSending(false);
        }
    };

    // --- thumbnail math for merge picker ---
    // figures out how to zoom and crop a face in a small circular thumbnail
    const THUMB = 72;
    const mergeThumbnail = (bb: any, iw: number | undefined, ih: number | undefined): any => {
        if (!bb || !iw || !ih) return { width: '100%', height: '100%' };

        const pad = 30;
        let scale = Math.max(THUMB / (bb.width + pad), THUMB / (bb.height + pad));
        let scaledW = iw * scale;
        let scaledH = ih * scale;

        // cover the thumbnail fully
        const coverFactor = Math.max(THUMB / scaledW, THUMB / scaledH, 1) * 1.05;
        scale *= coverFactor;
        scaledW *= coverFactor;
        scaledH *= coverFactor;

        // center the face in the thumbnail
        const centerX = bb.left + bb.width / 2;
        const centerY = bb.top + bb.height / 2;
        let tx = Math.min(0, Math.max(THUMB - scaledW, THUMB / 2 - centerX * scale));
        let ty = Math.min(0, Math.max(THUMB - scaledH, THUMB / 2 - centerY * scale));

        return { width: scaledW, height: scaledH, transform: [{ translateX: tx }, { translateY: ty }] };
    };

    const SendModal = (
        <Modal
            visible={showSendModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowSendModal(false)}
        >
            <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
                onPress={() => setShowSendModal(false)}
            >
                <View
                    style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        maxHeight: '92%', backgroundColor: '#1c1c1e',
                        borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40,
                    }}
                    onStartShouldSetResponder={() => true}
                >
                    <ScrollView
                        contentContainerStyle={{ padding: 20 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* group name section */}
                        <View className="mb-4">
                            <Text className="text-darkSecondary font-space text-[10px] mb-1.5 tracking-wider">
                                GROUP NAME
                            </Text>
                            {editingName ? (
                                <View className="flex-row gap-2">
                                    <TextInput
                                        value={nameInput}
                                        onChangeText={setNameInput}
                                        autoFocus
                                        placeholder="Enter a name..."
                                        placeholderTextColor="#5e5e5e"
                                        className="flex-1 bg-[#2a2a2a] text-white rounded-xl px-3.5 py-2.5 font-space text-sm"
                                    />
                                    <Pressable
                                        onPress={saveName}
                                        disabled={savingName}
                                        className="bg-blue-500 rounded-xl px-3.5 justify-center"
                                        style={{ opacity: savingName ? 0.5 : 1 }}
                                    >
                                        <CheckIcon color="white" size={18} />
                                    </Pressable>
                                </View>
                            ) : (
                                <Pressable
                                    onPress={() => { setEditingName(true); setNameInput(name); }}
                                    className="flex-row items-center gap-2"
                                >
                                    <Text className="text-white font-space text-lg flex-1" numberOfLines={1}>
                                        {name}
                                    </Text>
                                    <PencilIcon color="#5e5e5e" size={16} />
                                </Pressable>
                            )}
                        </View>

                        {/* whatsapp section */}
                        <Text className="text-darkSecondary font-space text-[10px] mb-2.5 tracking-wider">
                            WHATSAPP
                        </Text>

                        {/* contact search */}
                        <View className="mb-2.5">
                            <TextInput
                                value={contactSearch}
                                onChangeText={searchContacts}
                                placeholder="Search contacts by name..."
                                placeholderTextColor="#5e5e5e"
                                className="bg-[#2a2a2a] text-white rounded-xl px-3.5 py-2.5 font-space text-[13px]"
                            />

                            {/* contact search results */}
                            {contactResults.length > 0 && (
                                <View
                                    className="bg-[#1c1c1e] rounded-xl mt-0.5 overflow-hidden"
                                    style={{ maxHeight: 200 }}
                                >
                                    {contactResults.map((contact, i) => (
                                        <Pressable
                                            key={i}
                                            onPress={() => {
                                                setTempInput(contact.phone);
                                                setActiveOption('whatsapp');
                                                setContactSearch('');
                                                setContactResults([]);
                                                // auto fill the group name if its still default
                                                if (db && groupId) {
                                                    setNameInput(contact.name);
                                                    updateGroupLabel(db, groupId, contact.name)
                                                        .then(() => onLabelChanged?.(contact.name))
                                                        .catch(() => {});
                                                }
                                            }}
                                            className="flex-row justify-between items-center px-3.5 py-3"
                                            style={{
                                                borderBottomWidth: i < contactResults.length - 1 ? 1 : 0,
                                                borderBottomColor: '#2a2a2a',
                                            }}
                                        >
                                            <Text
                                                className="text-white font-space text-[13px] flex-1"
                                                numberOfLines={1}
                                            >
                                                {contact.name}
                                            </Text>
                                            <Text
                                                className="text-darkSecondary font-space text-[11px]"
                                                numberOfLines={1}
                                            >
                                                {contact.phone}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* send via whatsapp row */}
                        <Pressable
                            onPress={selectOption}
                            style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                backgroundColor: '#2a2a2a', padding: 14,
                                borderTopLeftRadius: 14, borderTopRightRadius: 14,
                                borderBottomLeftRadius: activeOption ? 0 : 14,
                                borderBottomRightRadius: activeOption ? 0 : 14,
                                borderWidth: activeOption ? 1 : 0, borderBottomWidth: 0,
                                borderColor: '#22c55e',
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                {/* green dot when phone is set, gray when not */}
                                <View style={{
                                    width: 8, height: 8, borderRadius: 4,
                                    backgroundColor: phone ? '#22c55e' : '#5e5e5e',
                                }} />
                                <Text style={{ color: 'white', fontFamily: 'SpaceMono', fontSize: 14 }}>
                                    Send via WhatsApp
                                </Text>
                            </View>
                            <Text
                                style={{ color: '#5e5e5e', fontSize: 11, fontFamily: 'SpaceMono', maxWidth: 120 }}
                                numberOfLines={1}
                            >
                                {phone ? phone : 'Tap to add →'}
                            </Text>
                        </Pressable>

                        {/* phone number input (shown when tapped) */}
                        {activeOption && (
                            <View
                                className="bg-[#2a2a2a] p-3 rounded-b-2xl mb-1"
                                style={{ borderWidth: 1, borderTopWidth: 0, borderColor: '#22c55e' }}
                            >
                                <TextInput
                                    value={tempInput}
                                    onChangeText={setTempInput}
                                    placeholder="e.g. 919123456789 (with country code)"
                                    placeholderTextColor="#5e5e5e"
                                    keyboardType="phone-pad"
                                    className="bg-[#1c1c1e] text-white rounded-xl px-3.5 py-2.5 mb-2 font-space"
                                />
                                <View className="flex-row gap-2">
                                    {/* save without sending */}
                                    <Pressable
                                        onPress={saveContactOnly}
                                        disabled={sending}
                                        className="flex-1 rounded-xl p-2.5 items-center"
                                        style={{ opacity: sending ? 0.5 : 1, backgroundColor: '#1c1c1e' }}
                                    >
                                        <Text className="text-white font-space">Save</Text>
                                    </Pressable>

                                    {/* save and send */}
                                    <Pressable
                                        onPress={saveAndSend}
                                        disabled={sending}
                                        className="flex-1 bg-green-500 rounded-xl p-2.5 items-center"
                                        style={{ opacity: sending ? 0.5 : 1 }}
                                    >
                                        <Text className="text-white font-space">
                                            {sending ? 'Sending...' : 'Send'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {/* edit phone link */}
                        {phone && (
                            <Pressable
                                onPress={() => { setEditPhone(phone ?? ''); setShowEdit(v => !v); }}
                                className="self-end mt-1 mb-4"
                            >
                                <Text className="text-darkSecondary font-space text-[11px]">
                                    {phone} · edit
                                </Text>
                            </Pressable>
                        )}

                        {/* edit phone input */}
                        {showEdit && (
                            <View className="bg-[#2a2a2a] rounded-xl p-3.5 mb-3.5">
                                <TextInput
                                    value={editPhone}
                                    onChangeText={setEditPhone}
                                    placeholder="e.g. 919123456789 (with country code)"
                                    placeholderTextColor="#5e5e5e"
                                    keyboardType="phone-pad"
                                    className="bg-[#1c1c1e] text-white rounded-xl px-3.5 py-2.5 font-space mb-2.5"
                                />
                                <Pressable
                                    onPress={saveEditedContact}
                                    disabled={savingEdit}
                                    className="bg-blue-500 rounded-xl p-2.5 items-center"
                                    style={{ opacity: savingEdit ? 0.5 : 1 }}
                                >
                                    <Text className="text-white font-space">
                                        {savingEdit ? 'Saving...' : 'Save number'}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {/* manage group section */}
                        <View className="border-t border-[#2a2a2a] pt-4 mt-1">
                            <Text className="text-darkSecondary font-space text-[10px] mb-3 tracking-wider">
                                MANAGE GROUP
                            </Text>

                            <View className="flex-row gap-2.5 mb-3.5">
                                {/* toggle merge picker */}
                                <Pressable
                                    onPress={() => setShowMerge(v => !v)}
                                    className="flex-1 bg-[#2a2a2a] rounded-xl p-3 items-center"
                                    style={{ borderWidth: showMerge ? 1 : 0, borderColor: '#6366f1' }}
                                >
                                    <Text className="text-indigo-300 font-space text-[13px]">Merge into...</Text>
                                </Pressable>

                                {/* delete group */}
                                <Pressable
                                    onPress={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 bg-[#2a2a2a] rounded-xl p-3 items-center"
                                    style={{ opacity: deleting ? 0.5 : 1 }}
                                >
                                    <Text className="text-red-400 font-space text-[13px]">
                                        {deleting ? 'Deleting...' : 'Delete group'}
                                    </Text>
                                </Pressable>
                            </View>

                            {/* horizontal list of groups to merge into */}
                            {showMerge && (
                                <FlatList
                                    horizontal
                                    data={allGroups ?? []}
                                    keyExtractor={g => g.group_id.toString()}
                                    showsHorizontalScrollIndicator={false}
                                    style={{ height: 108 }}
                                    contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4 }}
                                    ListEmptyComponent={
                                        <Text className="text-darkSecondary font-space p-3.5 text-[13px]">
                                            No other groups.
                                        </Text>
                                    }
                                    renderItem={({ item: g }) => {
                                        const bb = g.bounding_box;
                                        const zoomStyle = mergeThumbnail(bb, bb?.imageWidth, bb?.imageHeight);

                                        return (
                                            <Pressable
                                                onPress={() => handleMerge(g.group_id, g.label)}
                                                disabled={merging}
                                                style={{
                                                    alignItems: 'center',
                                                    marginRight: 12,
                                                    opacity: merging ? 0.5 : 1,
                                                }}
                                            >
                                                {/* circular face thumbnail */}
                                                <View style={{
                                                    width: THUMB, height: THUMB,
                                                    borderRadius: THUMB / 2,
                                                    overflow: 'hidden',
                                                    backgroundColor: '#2a2a2a',
                                                    borderWidth: 2, borderColor: '#6366f1',
                                                }}>
                                                    {g.image_uri
                                                        ? <Image source={{ uri: g.image_uri }} style={zoomStyle} resizeMode="cover" />
                                                        : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                            <Text style={{ color: '#5e5e5e', fontSize: 18 }}>?</Text>
                                                          </View>
                                                    }
                                                </View>
                                                <Text
                                                    className="text-indigo-300 font-space text-[10px] mt-1"
                                                    style={{ maxWidth: THUMB }}
                                                    numberOfLines={1}
                                                >
                                                    {g.label ?? `G${g.group_id}`}
                                                </Text>
                                            </Pressable>
                                        );
                                    }}
                                />
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );

    // --- main card image math ---
    // figures out how to zoom and crop the face in the square card
    const REF = 120;
    const imageWidth = boundingBox?.imageWidth;
    const imageHeight = boundingBox?.imageHeight;
    let imgStyle: any = { width: '100%', height: '100%' };

    if (imageWidth && imageHeight && boundingBox) {
        const pad = 40;
        const scale = Math.max(REF / (boundingBox.width + pad), REF / (boundingBox.height + pad));
        const scaledW = imageWidth * scale;
        const scaledH = imageHeight * scale;
        const centerX = boundingBox.left + boundingBox.width / 2;
        const centerY = boundingBox.top + boundingBox.height / 2;

        let tx = REF / 2 - centerX * scale;
        let ty = REF / 2 - centerY * scale;

        // clamp so the image doesnt go out of bounds
        tx = Math.min(0, Math.max(REF - scaledW, tx));
        ty = Math.min(0, Math.max(REF - scaledH, ty));

        imgStyle = { width: scaledW, height: scaledH, transform: [{ translateX: tx }, { translateY: ty }] };
    }

    return (
        <>
            {SendModal}

            <View style={{
                flex: 1, aspectRatio: 1,
                elevation: 6,
                shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.45, shadowRadius: 6,
            }}>
                <View style={{
                    flex: 1, overflow: 'hidden',
                    backgroundColor: '#111', borderRadius: 14,
                }}>
                    {/* the face photo */}
                    <Pressable
                        onPress={onPress}
                        onLongPress={onLongPress}
                        delayLongPress={200}
                        style={{ flex: 1 }}
                    >
                        <Image source={{ uri: imageUri }} style={imgStyle} resizeMode="cover" />
                    </Pressable>

                    {/* name gradient at the bottom */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        className="absolute bottom-0 left-0 right-0 px-1.5 pb-1"
                        style={{ paddingTop: 28 }}
                        pointerEvents="none"
                    >
                        <Text className="text-white font-space text-[10px]" numberOfLines={1}>{name}</Text>
                    </LinearGradient>

                    {/* photo count badge */}
                    <View className="absolute bottom-1.5 right-1.5 bg-black/55 rounded-lg px-1 py-0.5">
                        <Text className="text-white font-space text-[9px]">{photoCount}</Text>
                    </View>

                    {/* three dot menu button */}
                    <Pressable
                        onPress={openSendModal}
                        hitSlop={8}
                        className="absolute top-1 right-1 bg-black/50 rounded-lg p-0.5"
                    >
                        <EllipsisVerticalIcon color="white" size={14} />
                    </Pressable>

                    {/* selection checkbox (only shown during bulk selection) */}
                    {selected !== undefined && (
                        <View style={{
                            position: 'absolute', top: 6, right: 6,
                            width: 22, height: 22, borderRadius: 11,
                            backgroundColor: selected ? '#3b82f6' : 'rgba(0,0,0,0.4)',
                            borderWidth: 2, borderColor: 'white',
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            {selected && (
                                <Text className="text-white text-[11px]" style={{ lineHeight: 14 }}>✓</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </>
    );
}

export default FaceThumbnailCard;
