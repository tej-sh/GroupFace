package com.groupface.faceprocessing

import android.util.Log
import kotlin.math.sqrt

/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * implementation for clustering face embeddings
 *
 * Paper: https://en.wikipedia.org/wiki/DBSCAN
 */
class DbscanClusteringModule(
    val eps: Double = 0.6, // Maximum distance between points in a cluster
    val minPts: Int = 1    // Minimum points to form a cluster
) {
    private val TAG = "DbscanClusteringModule"

    /**
     * Cluster face embeddings using DBSCAN
     * @param embeddings List of face embedding vectors (FloatArray)
     * @return List of cluster assignments (clusterId for each embedding, -1 = noise)
     */
    fun cluster(embeddings: List<FloatArray>): List<Int> {
        val n = embeddings.size
        val labels = IntArray(n) { -1 } // -1 = unvisited/noise
        var clusterId = 0

        Log.d(TAG, "Starting DBSCAN clustering with ${n} embeddings (eps=$eps, minPts=$minPts)")

        for (i in 0 until n) {
            if (labels[i] != -1) continue // Already processed

            // Find all neighbors
            val neighbors = getNeighbors(embeddings, i)

            if (neighbors.size < minPts) {
                labels[i] = -1 // Mark as noise
                continue
            }

            // Start a new cluster
            labels[i] = clusterId
            expandCluster(embeddings, labels, i, neighbors, clusterId)
            clusterId++
        }

        Log.d(TAG, "DBSCAN completed: found $clusterId clusters")
        return labels.toList()
    }

    /**
     * Find all neighbors of a point within eps distance
     */
    private fun getNeighbors(embeddings: List<FloatArray>, pointIdx: Int): List<Int> {
        val neighbors = mutableListOf<Int>()
        val point = embeddings[pointIdx]

        for (i in embeddings.indices) {
            if (cosineSimilarity(point, embeddings[i]) >= (1.0 - eps)) {
                neighbors.add(i)
            }
        }

        return neighbors
    }

    /**
     * Expand cluster from a core point
     */
    private fun expandCluster(
        embeddings: List<FloatArray>,
        labels: IntArray,
        startIdx: Int,
        initialNeighbors: List<Int>,
        clusterId: Int
    ) {
        val queue = initialNeighbors.toMutableList()
        var queueIdx = 0

        while (queueIdx < queue.size) {
            val currentIdx = queue[queueIdx]
            queueIdx++

            if (labels[currentIdx] == -1) {
                labels[currentIdx] = clusterId

                // Find neighbors of current point
                val neighbors = getNeighbors(embeddings, currentIdx)
                if (neighbors.size >= minPts) {
                    // Add unvisited neighbors to queue
                    for (neighbor in neighbors) {
                        if (!queue.contains(neighbor)) {
                            queue.add(neighbor)
                        }
                    }
                }
            }
        }
    }

    /**
     * Calculate cosine similarity between two embedding vectors
     * Range: [0, 1] where 1 = identical, 0 = orthogonal
     * @return Cosine similarity value
     */
    private fun cosineSimilarity(a: FloatArray, b: FloatArray): Double {
        if (a.size != b.size) return 0.0

        var dotProduct = 0.0
        var normA = 0.0
        var normB = 0.0

        for (i in a.indices) {
            dotProduct += (a[i] * b[i]).toDouble()
            normA += (a[i] * a[i]).toDouble()
            normB += (b[i] * b[i]).toDouble()
        }

        val denominator = sqrt(normA) * sqrt(normB)
        return if (denominator > 0) dotProduct / denominator else 0.0
    }
}