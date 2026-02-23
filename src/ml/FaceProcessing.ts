import { NativeModules } from "react-native";
import RNFS from "react-native-fs";
import { insertFaces } from "../database/FacesDb";
import { getAllGroups, insertGroup } from "../database/groupsDb";

export async function getEmbeddingsAndBoundingBox(db: any, uri: any, photo_id: number) {
  const path = uri.startsWith("file://") ? uri.slice(7) : uri;
  const base64 = await RNFS.readFile(path, "base64");
  const results = await NativeModules.FaceProcessingModule.processImage(base64);

  // If no faces found, just return
  if (!results || results.length === 0) return;

  // 1. Load all existing groups and their references
  const existingGroups = await getAllGroups(db);

  for (let i = 0; i < results.length; i++) {
    const rawEmbedding: number[] = results[i]["embedding"]; // array of floats
    const stringifiedEmbedding = JSON.stringify(rawEmbedding);
    const boundingBox = JSON.stringify(results[i]["boundingBox"]);

    // 2. Incremental Matching: Compare current face against existing groups
    let bestMatchGroupId: number | null = null;
    let highestScore = 0;

    for (const group of existingGroups) {
      if (group.reference_embedding) {
        const refEmbedding: number[] = JSON.parse(group.reference_embedding);
        const score = cosineSimilarity(rawEmbedding, refEmbedding);

        if (score > highestScore) {
          highestScore = score;
        }

        // Using 0.75 as the threshold for MobileFaceNet
        if (score > 0.75 && highestScore === score) {
          bestMatchGroupId = group.id;
        }
      }
    }

    let finalGroupId: number;

    // 3. The Decision
    if (bestMatchGroupId !== null) {
      // It's an existing person!
      finalGroupId = bestMatchGroupId;
      console.log(`Matched face against Group ${finalGroupId} (Score: ${highestScore.toFixed(3)})`);
    } else {
      // It's a new person!
      console.log(`No match found (Highest score: ${highestScore.toFixed(3)}). Creating new group.`);
      finalGroupId = await insertGroup(db, stringifiedEmbedding);

      // Push the newly created group into the array so if there is another face 
      // of the same new person in the very next photo (or same photo), it matches!
      existingGroups.push({
        id: finalGroupId,
        label: null,
        email: null,
        reference_embedding: stringifiedEmbedding
      });
    }

    // 4. Finally, save the face with the proper group ID
    insertFaces(db, photo_id, boundingBox, stringifiedEmbedding, finalGroupId);
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}