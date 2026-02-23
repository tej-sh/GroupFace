package com.groupface.faceprocessing

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class FaceProcessingModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val TAG = "FaceProcessingModule"
    private val faceDetector = FaceDetectionModule()
    private val faceEmbedder = FaceEmbeddingModule(reactContext)
    private val dbscan = DbscanClusteringModule()

    override fun getName(): String = "FaceProcessingModule"

    /**
     * Detects faces in a base64-encoded image and returns bounding boxes.
     * JS usage: NativeModules.FaceProcessingModule.detectFaces(base64Image, promise)
     */
    @ReactMethod
    fun detectFaces(base64Image: String, promise: Promise) {
        try {
            val imageBytes = Base64.decode(base64Image, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                ?: return promise.reject("DECODE_ERROR", "Failed to decode image bitmap")

            val boxes = faceDetector.detectFaces(bitmap)
            val result = Arguments.createArray()
            boxes.forEach { box -> result.pushMap(box.toWritableMap()) }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "detectFaces error: ${e.message}", e)
            promise.reject("DETECT_ERROR", e.message, e)
        }
    }

    /**
     * Extracts a face embedding from a base64-encoded face-crop image.
     * JS usage: NativeModules.FaceProcessingModule.getEmbedding(base64FaceCrop, promise)
     */
    @ReactMethod
    fun getEmbedding(base64Image: String, promise: Promise) {
        try {
            val imageBytes = Base64.decode(base64Image, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                ?: return promise.reject("DECODE_ERROR", "Failed to decode image bitmap")

            val embedding = faceEmbedder.getEmbedding(bitmap)
                ?: return promise.reject("EMBEDDING_ERROR", "Failed to compute embedding")

            val result = Arguments.createArray()
            embedding.forEach { v -> result.pushDouble(v.toDouble()) }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "getEmbedding error: ${e.message}", e)
            promise.reject("EMBEDDING_ERROR", e.message, e)
        }
    }

    /**
     * Clusters a list of embeddings using DBSCAN and returns group IDs.
     * JS usage: NativeModules.FaceProcessingModule.clusterFaces(embeddingsArray, promise)
     * embeddingsArray: Array<Array<number>>  (each inner array is one 128-dim embedding)
     */
    @ReactMethod
    fun clusterFaces(embeddingsArray: ReadableArray, promise: Promise) {
        try {
            val embeddings = mutableListOf<FloatArray>()
            for (i in 0 until embeddingsArray.size()) {
                val inner = embeddingsArray.getArray(i)
                    ?: return promise.reject("INVALID_INPUT", "Embedding at index $i is null")
                val floats = FloatArray(inner.size()) { j -> inner.getDouble(j).toFloat() }
                embeddings.add(floats)
            }

            val labels = dbscan.cluster(embeddings)
            val result = Arguments.createArray()
            labels.forEach { label -> result.pushInt(label) }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "clusterFaces error: ${e.message}", e)
            promise.reject("CLUSTER_ERROR", e.message, e)
        }
    }

    /**
     * Full pipeline: detect faces → extract embeddings → cluster.
     * JS usage: NativeModules.FaceProcessingModule.processImage(base64Image, promise)
     */
    @ReactMethod
    fun processImage(base64Image: String, promise: Promise) {
        try {
            val imageBytes = Base64.decode(base64Image, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                ?: return promise.reject("DECODE_ERROR", "Failed to decode image bitmap")

            val boxes = faceDetector.detectFaces(bitmap)
            if (boxes.isEmpty()) {
                return promise.resolve(Arguments.createArray())
            }

            val embeddings = mutableListOf<FloatArray>()
            val faceResults = mutableListOf<FaceResult>()

            for (box in boxes) {
                val left = box.left.toInt().coerceAtLeast(0)
                val top = box.top.toInt().coerceAtLeast(0)
                val width = box.width.toInt().coerceAtMost(bitmap.width - left)
                val height = box.height.toInt().coerceAtMost(bitmap.height - top)

                if (width <= 0 || height <= 0) continue

                val faceCrop = Bitmap.createBitmap(bitmap, left, top, width, height)
                val embedding = faceEmbedder.getEmbedding(faceCrop)

                if (embedding != null) {
                    embeddings.add(embedding)
                    faceResults.add(FaceResult(boundingBox = box, embedding = embedding))
                }
            }

            val labels = if (embeddings.isNotEmpty()) dbscan.cluster(embeddings) else emptyList()

            val result = Arguments.createArray()
            faceResults.forEachIndexed { idx, face ->
                val groupId = if (idx < labels.size) labels[idx] else -1
                result.pushMap(face.copy(groupId = groupId).toWritableMap())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "processImage error: ${e.message}", e)
            promise.reject("PROCESS_ERROR", e.message, e)
        }
    }

    override fun onCatalystInstanceDestroy() {
        faceDetector.release()
        faceEmbedder.release()
        super.onCatalystInstanceDestroy()
    }
}
