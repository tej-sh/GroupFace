package com.groupface.faceprocessing

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

data class BoundingBox(
    val left: Float,
    val top: Float,
    val width: Float,
    val height: Float
) {
    fun toWritableMap(): WritableMap = Arguments.createMap().apply {
        putDouble("left", left.toDouble())
        putDouble("top", top.toDouble())
        putDouble("width", width.toDouble())
        putDouble("height", height.toDouble())
    }
}

data class FaceEmbedding(
    val vector: FloatArray,
    val confidence: Float = 0.95f
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as FaceEmbedding
        if (!vector.contentEquals(other.vector)) return false
        if (confidence != other.confidence) return false
        return true
    }

    override fun hashCode(): Int {
        var result = vector.contentHashCode()
        result = 31 * result + confidence.hashCode()
        return result
    }
}

data class FaceResult(
    val boundingBox: BoundingBox,
    val embedding: FloatArray,
    val groupId: Int = -1
) {
    fun toWritableMap(): WritableMap = Arguments.createMap().apply {
        putMap("boundingBox", boundingBox.toWritableMap())
        val embeddingArray: WritableArray = Arguments.createArray()
        embedding.forEach { value ->
            embeddingArray.pushDouble(value.toDouble())
        }
        putArray("embedding", embeddingArray)
        putInt("groupId", groupId)
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as FaceResult
        if (boundingBox != other.boundingBox) return false
        if (!embedding.contentEquals(other.embedding)) return false
        if (groupId != other.groupId) return false
        return true
    }

    override fun hashCode(): Int {
        var result = boundingBox.hashCode()
        result = 31 * result + embedding.contentHashCode()
        result = 31 * result + groupId
        return result
    }
}

data class ClusterGroup(
    val clusterId: Int,
    val faceIndices: List<Int>
)