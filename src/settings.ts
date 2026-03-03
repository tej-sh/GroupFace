import RNFS from 'react-native-fs';

const SETTINGS_FILE = `${RNFS.DocumentDirectoryPath}/groupface_settings.json`;

type Settings = {
  threshold: number;
  galleryShowAll: boolean;
  autoMergeContacts: boolean;
};

const DEFAULTS: Settings = {
  threshold: 0.60,
  galleryShowAll: false,
  autoMergeContacts: false,
};

async function readSettings(): Promise<Settings> {
  try {
    const fileExists = await RNFS.exists(SETTINGS_FILE);
    if (!fileExists) {
      // no settings file yet, just return defaults
      return { ...DEFAULTS };
    }
    const fileContent = await RNFS.readFile(SETTINGS_FILE, 'utf8');
    // merge with defaults so new settings keys still work
    return { ...DEFAULTS, ...JSON.parse(fileContent) };
  } catch (error) {
    // if anything goes wrong, just use defaults
    return { ...DEFAULTS };
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  await RNFS.writeFile(SETTINGS_FILE, JSON.stringify(settings), 'utf8');
}

export async function getThreshold(): Promise<number> {
  const settings = await readSettings();
  return settings.threshold;
}

export async function setThreshold(value: number): Promise<void> {
  const settings = await readSettings();
  settings.threshold = Math.min(0.95, Math.max(0.30, Math.round(value * 100) / 100));
  await writeSettings(settings);
}

export async function getGalleryShowAll(): Promise<boolean> {
  const settings = await readSettings();
  return settings.galleryShowAll;
}

export async function setGalleryShowAll(value: boolean): Promise<void> {
  const settings = await readSettings();
  settings.galleryShowAll = value;
  await writeSettings(settings);
}

export async function getAutoMergeContacts(): Promise<boolean> {
  const settings = await readSettings();
  return settings.autoMergeContacts;
}

export async function setAutoMergeContacts(value: boolean): Promise<void> {
  const settings = await readSettings();
  settings.autoMergeContacts = value;
  await writeSettings(settings);
}

