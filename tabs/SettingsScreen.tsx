import { View, Text, Pressable, Switch, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
    getThreshold, setThreshold,
    getGalleryShowAll, setGalleryShowAll,
    getAutoMergeContacts, setAutoMergeContacts,
} from '../src/settings';
import { MinusIcon, PlusIcon } from 'react-native-heroicons/outline';

export function SettingsScreen() {
    const insets = useSafeAreaInsets();

    const [threshold, setThresholdState] = useState(0.60);
    const [galleryShowAll, setGalleryShowAllState] = useState(false);
    const [autoMerge, setAutoMergeState] = useState(false);

    useEffect(() => {
        getThreshold().then(setThresholdState);
        getGalleryShowAll().then(setGalleryShowAllState);
        getAutoMergeContacts().then(setAutoMergeState);
    }, []);

    const changeThreshold = async (delta: number) => {
        const next = Math.min(0.95, Math.max(0.30, Math.round((threshold + delta) * 100) / 100));
        setThresholdState(next);
        await setThreshold(next);
    };

    const thresholdLabel =
        threshold <= 0.45 ? 'Very loose' :
        threshold <= 0.55 ? 'Loose' :
        threshold <= 0.65 ? 'Balanced ✓' :
        threshold <= 0.75 ? 'Strict' : 'Very strict';

    return (
        <View className="flex-1 bg-darkBackground" style={{ paddingTop: insets.top + 8 }}>
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-white font-space text-4xl mt-2 mb-8">Settings</Text>

                {/* FACE MATCH THRESHOLD section */}
                <Text className="text-darkSecondary font-space text-[13px] mb-2.5 tracking-widest">
                    FACE-MATCH THRESHOLD
                </Text>

                <View className="bg-[#1a1a1a] rounded-xl p-4 mb-2">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-white font-space text-sm">Threshold</Text>

                        {/* +/- controls */}
                        <View className="flex-row items-center gap-2">
                            <Pressable
                                onPress={() => changeThreshold(-0.05)}
                                disabled={threshold <= 0.30}
                                className="bg-[#2a2a2a] rounded-lg w-8 h-8 justify-center items-center"
                                style={{ opacity: threshold <= 0.30 ? 0.3 : 1 }}
                            >
                                <MinusIcon color="white" size={16} />
                            </Pressable>

                            <Text
                                className="text-white font-space text-center text-[16px]"
                                style={{ width: 42 }}
                            >
                                {threshold.toFixed(2)}
                            </Text>

                            <Pressable
                                onPress={() => changeThreshold(+0.05)}
                                disabled={threshold >= 0.95}
                                className="bg-[#2a2a2a] rounded-lg w-8 h-8 justify-center items-center"
                                style={{ opacity: threshold >= 0.95 ? 0.3 : 1 }}
                            >
                                <PlusIcon color="white" size={16} />
                            </Pressable>
                        </View>
                    </View>

                    <Text className="text-darkSecondary font-space text-[13px] mt-2">
                        {thresholdLabel} — lower groups more faces together, higher separates them more
                    </Text>
                </View>

                <Pressable
                    onPress={() => { setThresholdState(0.60); setThreshold(0.60); }}
                    className="self-end mb-6"
                >
                    <Text className="text-red-500 font-space text-[12px]">Reset to 0.60</Text>
                </Pressable>

                {/* GALLERY section */}
                <Text className="text-darkSecondary font-space text-[13px] mb-2.5 tracking-widest">
                    GALLERY
                </Text>

                <View className="bg-[#1a1a1a] rounded-xl p-4 flex-row items-center justify-between">
                    <View>
                        <Text className="text-white font-space text-sm">Show all albums</Text>
                        <Text className="text-darkSecondary font-space text-[13px] mt-1">
                            Not just Camera Roll
                        </Text>
                    </View>
                    <Switch
                        value={galleryShowAll}
                        onValueChange={v => { setGalleryShowAllState(v); setGalleryShowAll(v); }}
                        trackColor={{ false: '#2a2a2a', true: '#3b82f6' }}
                        thumbColor="white"
                    />
                </View>

                {/* CONTACTS section */}
                <Text className="text-darkSecondary font-space text-[13px] mb-2.5 mt-6 tracking-widest">
                    CONTACTS
                </Text>

                <View className="bg-[#1a1a1a] rounded-xl p-4 flex-row items-center justify-between">
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text className="text-white font-space text-sm">Auto-merge same contact</Text>
                        <Text className="text-darkSecondary font-space text-[13px] mt-1">
                            Merge groups that share the same phone number
                        </Text>
                    </View>
                    <Switch
                        value={autoMerge}
                        onValueChange={v => { setAutoMergeState(v); setAutoMergeContacts(v); }}
                        trackColor={{ false: '#2a2a2a', true: '#3b82f6' }}
                        thumbColor="white"
                    />
                </View>

                {/* SUPPORT section */}
                <Text className="text-darkSecondary font-space text-[13px] mb-2.5 mt-6 tracking-widest">
                    SUPPORT
                </Text>

                <View className="bg-[#1a1a1a] rounded-xl p-4 mb-2.5">
                    <Text className="text-white font-space text-sm mb-1">Donate</Text>
                    <Pressable onPress={() => Linking.openURL('https://www.buymeacoffee.com/Tejesh012')}>
                        <Text className="text-darkSecondary font-space text-[13px]">Buy me a coffee ↗</Text>
                    </Pressable>
                </View>

                <View className="bg-[#1a1a1a] rounded-xl p-4 mb-2.5">
                    <Text className="text-white font-space text-sm mb-1">Source Code</Text>
                    <Pressable onPress={() => Linking.openURL('https://github.com/tejesh012/GroupFace')}>
                        <Text className="text-darkSecondary font-space text-[13px]">
                            github.com/tejesh012/GroupFace ↗
                        </Text>
                    </Pressable>
                </View>

                {/* ABOUT section */}
                <Text className="text-darkSecondary font-space text-[13px] mb-2.5 mt-6 tracking-widest">
                    ABOUT
                </Text>

                <View className="bg-[#1a1a1a] rounded-xl p-4">
                    <Text className="text-darkSecondary font-space text-sm leading-6">
                        GroupFace{'\n'}Version 1.0.0
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
