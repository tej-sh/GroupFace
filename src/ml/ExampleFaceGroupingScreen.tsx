import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { processImageAndCluster, FaceResult } from './FaceProcessing';

export const ExampleFaceGroupingScreen = () => {
  const [faces, setFaces] = useState<FaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessImage = async (imagePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await processImageAndCluster(imagePath);
      setFaces(results);
      
      // Group by cluster ID
      const groupedByCluster = new Map<number, FaceResult[]>();
      results.forEach((face) => {
        if (!groupedByCluster.has(face.groupId)) {
          groupedByCluster.set(face.groupId, []);
        }
        groupedByCluster.get(face.groupId)!.push(face);
      });

      console.log(`Found ${groupedByCluster.size} face groups`);
      groupedByCluster.forEach((faces, clusterId) => {
        console.log(`Group ${clusterId}: ${faces.length} faces`);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Face Grouping</Text>
      
      <Button
        title="Process Image"
        onPress={() => handleProcessImage('/path/to/image.jpg')}
        disabled={loading}
      />

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {faces.length > 0 && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultTitle}>Detected {faces.length} faces</Text>
          {faces.map((face, idx) => (
            <View key={idx} style={styles.faceCard}>
              <Text>Face {idx + 1}</Text>
              <Text>Group ID: {face.groupId}</Text>
              <Text>Box: ({face.boundingBox.left.toFixed(0)}, {face.boundingBox.top.toFixed(0)})</Text>
              <Text>Size: {face.boundingBox.width.toFixed(0)}x{face.boundingBox.height.toFixed(0)}</Text>
              <Text>Embedding: [{face.embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...] (128-dim)</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 20,
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
  },
  resultsBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  faceCard: {
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
});