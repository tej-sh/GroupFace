import { NativeModules, Platform } from 'react-native';

const { FaceProcessing } = NativeModules;

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FaceResult {
  boundingBox: BoundingBox;
  embedding: number[];
  groupId: number;
}

export async function processImageAndCluster(
  imagePath: string
): Promise<FaceResult[]> {
  if (Platform.OS !== 'android') {
    throw new Error('Face processing only available on Android');
  }

  try {
    const result = await FaceProcessing.processImageAndCluster(imagePath);
    return result as FaceResult[];
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}