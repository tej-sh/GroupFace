import { NativeModules } from "react-native";
import RNFS from "react-native-fs";
import { insertFaces, getFaceDataByGroupId } from "../database/FacesDb";
import { getAllGroups, insertGroup } from "../database/groupsDb";
import { getThreshold } from "../settings";

function normalize(vec: number[]) {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map(v => v / norm);
}
//this to sesnd to native module ->embedding and bounding boc 
export async function extractFacesFromImage(uri: string) {
  let path: string;
  let tmpPath: string | null = null;

  if (uri.startsWith("content://")) {
    // content:// URIs can't be read directly by the native module — copy to a temp file first
    tmpPath = `${RNFS.TemporaryDirectoryPath}/face_tmp_${Date.now()}.jpg`;
    await RNFS.copyFile(uri, tmpPath);
    path = tmpPath;
  } else {
    path = uri.startsWith("file://") ? uri.slice(7) : uri;
  }

  console.log("[FaceProcessing] extractFacesFromImage start:", path);
  try {
    const results = await NativeModules.FaceProcessingModule.processImageFromUri(path);
    console.log("[FaceProcessing] native result count:", results?.length ?? 0);
    if (!results || results.length === 0) {
      console.log("[FaceProcessing] no faces detected for:", path);
      return [];
    }

    return results.map((face: any) => ({
      embedding: face.embedding,
      boundingBox: {
        ...face.boundingBox,
        imageWidth: face.imageWidth,
        imageHeight: face.imageHeight,
      },
      qualityScore: face.qualityScore ?? 0,
    }));
  } finally {
    // Always clean up the temp file to avoid filling storage
    if (tmpPath) {
      RNFS.unlink(tmpPath).catch(() => {});
    }
  }
}

/**
 * Find best matching group by comparing against ALL face embeddings in each group.
 * This is more robust than just comparing against a single reference embedding.
 */
export async function findBestMatchingGroup(db: any, embedding: number[], threshold: number = 0.60) {
  const groups = await getAllGroups(db);
  const normalizedInput = normalize(embedding);
  
  // Debug: check if input embedding looks valid
  console.log(`[Match] Input embedding length: ${embedding.length}, first 3: [${embedding.slice(0,3).map(v => v.toFixed(4)).join(', ')}]`);
  
  let bestGroupId: number | null = null;
  let highestScore = 0;

  for (const group of groups) {
    // Get all faces in this group

    const facesInGroup = await getFaceDataByGroupId(db, group.id);
    
    
    // Compare against all embeddings in the group, take the best match
    let bestScoreInGroup = 0;
    
    for (const face of facesInGroup) {
      if (!face.embedding) continue;
      
      const parsedEmbedding = JSON.parse(face.embedding);
      console.log(`[Match] Face ${face.id} embedding length: ${parsedEmbedding.length}, first 3: [${parsedEmbedding.slice(0,3).map((v: number) => v.toFixed(4)).join(', ')}]`);
      
      const faceEmbedding = normalize(parsedEmbedding);
      const score = cosineSimilarity(normalizedInput, faceEmbedding);
      
      if (score > bestScoreInGroup) {
        bestScoreInGroup = score;
      }
    }
    
    // Also check against reference embedding (for backward compatibility)
    if (group.reference_embedding) {
      const parsedRef = JSON.parse(group.reference_embedding);
      console.log(`[Match] Group ${group.id} ref embedding length: ${parsedRef.length}, first 3: [${parsedRef.slice(0,3).map((v: number) => v.toFixed(4)).join(', ')}]`);
      
      const reference = normalize(parsedRef);
      const refScore = cosineSimilarity(normalizedInput, reference);
      if (refScore > bestScoreInGroup) {
        bestScoreInGroup = refScore;
      }
    }
    
    console.log(`Group ${group.id}: best score = ${bestScoreInGroup.toFixed(3)}`);

    if (bestScoreInGroup > highestScore) {
      highestScore = bestScoreInGroup;
      bestGroupId = group.id;
    }
  }
  
  console.log(`Best matching group ID: ${bestGroupId} with score: ${highestScore.toFixed(3)}`);
  
  if (highestScore > threshold) {
    return bestGroupId;
  }

  return null;
}
//new group and return group id
export async function createNewGroup(db: any, embedding: number[]) {
  const stringEmbedding = JSON.stringify(embedding);
  return await insertGroup(db, stringEmbedding);
}

export async function saveFace(db: any, photo_id: number, boundingBox: any, embedding: number[], groupId: number, qualityScore: number = 0) {
  await insertFaces(
    db,
    photo_id,
    JSON.stringify(boundingBox),
    JSON.stringify(embedding),
    groupId,
    qualityScore
  );
}


export async function processPhoto(db: any, uri: string, photo_id: number) {
    try {
      console.log(`[FaceProcessing] processPhoto start: photo_id=${photo_id}, uri=${uri}`);
      const embeddingsAndBoxes = await extractFacesFromImage(uri);
      console.log(`[FaceProcessing] faces extracted for photo_id=${photo_id}: ${embeddingsAndBoxes.length}`);

      for (const item of embeddingsAndBoxes){
        const embedding = item.embedding;
        const boundingBox = item.boundingBox;
        const qualityScore = item.qualityScore ?? 0;
        const threshold = await getThreshold();
        let groupId = await findBestMatchingGroup(db, embedding, threshold);
        if (groupId === null){
          groupId = await createNewGroup(db, embedding);
          console.log(`[FaceProcessing] created new group_id=${groupId} for photo_id=${photo_id}`);
        }
        await saveFace(db, photo_id, boundingBox, embedding, groupId, qualityScore)
        console.log(`[FaceProcessing] saved face for photo_id=${photo_id}, group_id=${groupId}, quality=${qualityScore.toFixed(2)}`);
      }

      console.log(`[FaceProcessing] processPhoto done: photo_id=${photo_id}`);
    } catch (error) {
      console.log(`[FaceProcessing] processPhoto failed: photo_id=${photo_id}`);
      console.log(error);
      throw error;
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