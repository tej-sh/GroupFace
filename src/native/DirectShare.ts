import { NativeModules, Platform } from 'react-native';

const { DirectShare } = NativeModules;

export const APPS = {
    TELEGRAM: 'org.telegram.messenger',
    WHATSAPP: 'com.whatsapp',
};

export async function shareImagesToApp(uris: string[], appPackage: string, phone: string = ''): Promise<void> {
    if (Platform.OS !== 'android') throw new Error('DirectShare is Android-only');
    await DirectShare.shareToApp(uris, appPackage, phone);
}

export async function shareImagesViaEmail(uris: string[], email: string): Promise<void> {
    if (Platform.OS !== 'android') throw new Error('DirectShare is Android-only');
    await DirectShare.shareViaEmail(uris, email);
}
