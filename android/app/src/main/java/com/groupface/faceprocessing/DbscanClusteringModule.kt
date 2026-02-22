package com.groupface.faceprocessing

import android.util.Log
import kotlin.math.sqrt

class DbscanClusteringModule(
    val eps: Double = 0.6,
    val minPts: Int = 1
) {
    private val TAG = "DbscanClusteringModule"

    fun cluster(embeddings: List<FloatArray>): List<Int> {
        val n = embeddings.size
        val labels = IntArray(n) { -1 }
        var clusterId = 0

        Log.d(TAG, "Starting DBSCAN clustering with $n embeddings")

        for (i in 0 until n) {
            if (labels[i] != -1) continue

            val neighbors = getNeighbors(embeddings, i)

            if (neighbors.size < minPts) {
                labels[i] = -1
                continue
            }

            labels[i] = clusterId
            expandCluster(embeddings, labels, i, neighbors, clusterId)
            clusterId++
        }

        Log.d(TAG, "DBSCAN completed: found $clusterId clusters")
        return labels.toList()
    }

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

                val neighbors = getNeighbors(embeddings, currentIdx)
                if (neighbors.size >= minPts) {
                    for (neighbor in neighbors) {
                        if (!queue.contains(neighbor)) {
                            queue.add(neighbor)
                        }
                    }
                }
            }
        }
    }

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