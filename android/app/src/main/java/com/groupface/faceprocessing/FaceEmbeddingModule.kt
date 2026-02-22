package com.groupface.faceprocessing

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.common.FileUtil
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.sqrt

/**
 * Handles face embedding extraction using MobileFaceNet TFLite model
 * Loads the model from assets and runs inference on cropped face images
 */
class FaceEmbeddingModule(private val context: Context) {
    private var interpreter: Interpreter? = null
    private val TAG = "FaceEmbeddingModule"
    
    // MobileFaceNet standard parameters
    private val inputSize = 112
    private val embeddingDim = 128
    private val modelName = "mobilefacenet.tflite"

    init {
        loadModel()
    }

    /**
     * Load the MobileFaceNet model from assets
     */
    private fun loadModel() {
        try {
            val modelBuffer = FileUtil.loadMappedFile(context, modelName)
            val options = Interpreter.Options().apply {
                setNumThreads(4) // Use 4 threads for inference
                setUseNNAPI(true) // Use NNAPI acceleration if available
            }
            interpreter = Interpreter(modelBuffer, options)
            Log.d(TAG, "MobileFaceNet model loaded successfully from assets")
        } catch (e: Exception) {
            Log.e(TAG, "Error loading MobileFaceNet model: ${e.message}", e)
        }
    }

    /**
     * Extract face embedding from a cropped face bitmap
     * @param faceBitmap Cropped face image (should be around 112x112, but will be resized)
     * @return FloatArray of 128 dimensions (normalized L2), or null on error
     */
    fun getEmbedding(faceBitmap: Bitmap): FloatArray? {
        return try {
            if (interpreter == null) {
                Log.e(TAG, "Interpreter is null. Model not loaded.")
                return null
            }

            // Resize face to model input size (112x112)
            val resizedBitmap = Bitmap.createScaledBitmap(faceBitmap, inputSize, inputSize, true)

            // Convert bitmap to ByteBuffer (normalized RGB)
            val inputBuffer = bitmapToByteBuffer(resizedBitmap)

            // Run inference
            val output = Array(1) { FloatArray(embeddingDim) }
            interpreter?.run(inputBuffer, output)

            val embedding = output[0]

            // L2 normalization: divide each element by the norm
            val norm = sqrt(embedding.map { it * it }.sum())
            
            val normalizedEmbedding = if (norm > 0) {
                embedding.map { it / norm }.toFloatArray()
            } else {
                embedding
            }

            Log.d(TAG, "Successfully extracted embedding with norm=$norm")
            normalizedEmbedding

        } catch (e: Exception) {
            Log.e(TAG, "Error extracting embedding: ${e.message}", e)
            null
        }
    }

    /**
     * Convert bitmap to ByteBuffer with normalization
     * Normalizes RGB values to [-1, 1] range
     * @param bitmap Input image
     * @return ByteBuffer ready for inference
     */
    private fun bitmapToByteBuffer(bitmap: Bitmap): ByteBuffer {
        val byteBuffer = ByteBuffer.allocateDirect(1 * inputSize * inputSize * 3 * 4)
        byteBuffer.order(ByteOrder.nativeOrder())

        val pixels = IntArray(inputSize * inputSize)
        bitmap.getPixels(pixels, 0, inputSize, 0, 0, inputSize, inputSize)

        for (pixel in pixels) {
            // Extract RGB channels
            val r = ((pixel shr 16) and 0xFF).toFloat()
            val g = ((pixel shr 8) and 0xFF).toFloat()
            val b = (pixel and 0xFF).toFloat()

            // Normalize to [-1, 1]
            byteBuffer.putFloat(r / 127.5f - 1.0f)
            byteBuffer.putFloat(g / 127.5f - 1.0f)
            byteBuffer.putFloat(b / 127.5f - 1.0f)
        }

        byteBuffer.rewind()
        return byteBuffer
    }

    /**
     * Release model resources
     */
    fun release() {
        try {
            interpreter?.close()
            interpreter = null
            Log.d(TAG, "Interpreter released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing interpreter: ${e.message}")
        }
    }
}