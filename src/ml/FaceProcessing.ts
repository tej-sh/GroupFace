import { NativeModules } from "react-native";
import RNFS from 'react-native-fs'
import { insertFaces } from "../database/FacesDb";

const { FaceProcessing } = NativeModules;
export async function getEmbeddingsAndBoundingBox(db: any, uri: any, photo_id: number) {
  const path = uri.startsWith('file://') ? uri.slice(7) : uri;
  const base64 = await RNFS.readFile(path, 'base64');
  const results = await NativeModules.FaceProcessingModule.processImage(base64)
  for (let i = 0; i < results.length; i++) {
    const bounding_box = JSON.stringify(results[i]["boundingBox"])
    const embedding = JSON.stringify(results[i]["embedding"])
    const group_id = results[i]["groupId"]

    insertFaces(db, photo_id, bounding_box, embedding, group_id)
  }
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