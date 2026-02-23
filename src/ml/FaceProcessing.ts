import { NativeModules } from "react-native";
import RNFS from 'react-native-fs'

const { FaceProcessing } = NativeModules;

export async function getEmbeddingsAndBoundingBox(db:any ,uri: any) {
  // Strip "file://" prefix before passing to RNFS
  const path = uri.startsWith('file://') ? uri.slice(7) : uri;
  const base64 = await RNFS.readFile(path, 'base64');
  const results = await NativeModules.FaceProcessingModule.processImage(base64)
  
  return results
}









// import { NativeModules, Platform } from 'react-native';

// const { FaceProcessing } = NativeModules;

// export interface BoundingBox {
//   left: number;
//   top: number;
//   width: number;
//   height: number;
// }

// export interface FaceResult {
//   boundingBox: BoundingBox;
//   embedding: number[];
//   groupId: number;
// }

// export async function processImageAndCluster(
//   imagePath: string
// ): Promise<FaceResult[]> {
//   if (Platform.OS !== 'android') {
//     throw new Error('Face processing only available on Android');
//   }

//   try {
//     const result = await FaceProcessing.processImageAndCluster(imagePath);
//     return result as FaceResult[];
//   } catch (error) {
//     console.error('Error processing image:', error);
//     throw error;
//   }
// }