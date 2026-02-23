package com.groupface.faceprocessing

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.common.FileUtil
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.sqrt

class FaceEmbeddingModule(private val context: Context) {
    private var interpreter: Interpreter? = null
    private val TAG = "FaceEmbeddingModule"
    
    private val inputSize = 112
    private val embeddingDim = 192
    private val modelName = "mobilefacenet.tflite"

    init {
        loadModel()
    }

    private fun loadModel() {
        try {
            val modelBuffer = FileUtil.loadMappedFile(context, modelName)
            val options = Interpreter.Options().apply {
                setNumThreads(4)
                setUseNNAPI(true)
            }
            interpreter = Interpreter(modelBuffer, options)
            Log.d(TAG, "MobileFaceNet model loaded successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error loading model: ${e.message}", e)
        }
    }

    fun getEmbedding(faceBitmap: Bitmap): FloatArray? {
        return try {
            if (interpreter == null) {
                Log.e(TAG, "Interpreter is null")
                return null
            }

            val resizedBitmap = Bitmap.createScaledBitmap(faceBitmap, inputSize, inputSize, true)
            val inputBuffer = bitmapToByteBuffer(resizedBitmap)

            val output = Array(1) { FloatArray(embeddingDim) }
            interpreter?.run(inputBuffer, output)

            val embedding = output[0]
            val norm = sqrt(embedding.map { it * it }.sum())
            
            val normalizedEmbedding = if (norm > 0) {
                embedding.map { it / norm }.toFloatArray()
            } else {
                embedding
            }

            Log.d(TAG, "Successfully extracted embedding")
            normalizedEmbedding

        } catch (e: Exception) {
            Log.e(TAG, "Error extracting embedding: ${e.message}", e)
            null
        }
    }

    private fun bitmapToByteBuffer(bitmap: Bitmap): ByteBuffer {
        val byteBuffer = ByteBuffer.allocateDirect(1 * inputSize * inputSize * 3 * 4)
        byteBuffer.order(ByteOrder.nativeOrder())

        val pixels = IntArray(inputSize * inputSize)
        bitmap.getPixels(pixels, 0, inputSize, 0, 0, inputSize, inputSize)

        for (pixel in pixels) {
            val r = ((pixel shr 16) and 0xFF).toFloat()
            val g = ((pixel shr 8) and 0xFF).toFloat()
            val b = (pixel and 0xFF).toFloat()

            byteBuffer.putFloat(r / 127.5f - 1.0f)
            byteBuffer.putFloat(g / 127.5f - 1.0f)
            byteBuffer.putFloat(b / 127.5f - 1.0f)
        }

        byteBuffer.rewind()
        return byteBuffer
    }

    fun release() {
        try {
            interpreter?.close()
            interpreter = null
            Log.d(TAG, "Interpreter released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing: ${e.message}")
        }
    }
}