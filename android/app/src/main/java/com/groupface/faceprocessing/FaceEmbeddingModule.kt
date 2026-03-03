package com.groupface.faceprocessing

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.common.FileUtil
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.sqrt
import kotlin.math.abs

class FaceEmbeddingModule(private val context: Context) {
    private var interpreter: Interpreter? = null
    private val TAG = "FaceEmbeddingModule"
    
    private val inputSize = 160
    private var embeddingDim = 128
    private val modelName = "facenet.tflite"

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

            val outputShape = interpreter?.getOutputTensor(0)?.shape()
            if (outputShape != null && outputShape.isNotEmpty()) {
                embeddingDim = outputShape.last()
            }

            Log.d(TAG, "FaceNet model loaded successfully with embeddingDim=$embeddingDim")
        } catch (e: Exception) {
            Log.e(TAG, "Error loading model: ${e.message}", e)
        }
    }

    // Minimum blur score (Laplacian variance) - lower = more blurry
    private val MIN_BLUR_SCORE = 100.0
    private val SHARPEN_THRESHOLD = 300.0  // Apply sharpening if below this score
    
    fun getEmbedding(faceBitmap: Bitmap): FloatArray? {
        return try {
            if (interpreter == null) {
                Log.e(TAG, "Interpreter is null")
                return null
            }

            var resizedBitmap = Bitmap.createScaledBitmap(faceBitmap, inputSize, inputSize, true)
            
            // Check blur and enhance if needed
            val blurScore = calculateBlurScore(resizedBitmap)
            Log.d(TAG, "Face blur score: $blurScore")
            
            if (blurScore < SHARPEN_THRESHOLD) {
                // Apply sharpening to enhance blurry face
                Log.d(TAG, "Applying sharpening (blur score: $blurScore < $SHARPEN_THRESHOLD)")
                resizedBitmap = sharpenImage(resizedBitmap)
                val newBlurScore = calculateBlurScore(resizedBitmap)
                Log.d(TAG, "After sharpening, blur score: $newBlurScore")
            }
            
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
    
    /**
     * Calculate blur score using Laplacian variance.
     * Higher score = sharper image, lower score = blurrier image.
     * This detects blur from zooming, motion blur, and out-of-focus faces.
     */
    private fun calculateBlurScore(bitmap: Bitmap): Double {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        
        // Convert to grayscale
        val gray = IntArray(width * height)
        for (i in pixels.indices) {
            val r = (pixels[i] shr 16) and 0xFF
            val g = (pixels[i] shr 8) and 0xFF
            val b = pixels[i] and 0xFF
            gray[i] = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
        }
        
        // Apply Laplacian kernel and calculate variance
        // Laplacian kernel: [0, 1, 0], [1, -4, 1], [0, 1, 0]
        var sum = 0.0
        var sumSq = 0.0
        var count = 0
        
        for (y in 1 until height - 1) {
            for (x in 1 until width - 1) {
                val idx = y * width + x
                val laplacian = (
                    gray[idx - width] +          // top
                    gray[idx - 1] +               // left
                    gray[idx + 1] +               // right
                    gray[idx + width] -           // bottom
                    4 * gray[idx]                 // center
                ).toDouble()
                
                sum += laplacian
                sumSq += laplacian * laplacian
                count++
            }
        }
        
        if (count == 0) return 0.0
        
        val mean = sum / count
        val variance = (sumSq / count) - (mean * mean)
        
        return abs(variance)
    }
    
    /**
     * Sharpen image using unsharp masking technique.
     * This enhances edges and details in blurry faces.
     */
    private fun sharpenImage(bitmap: Bitmap): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        
        val result = IntArray(width * height)
        
        // Sharpening kernel (unsharp mask approximation):
        // [0, -1, 0]
        // [-1, 5, -1]
        // [0, -1, 0]
        // Center weight 5, neighbors -1 = enhances differences from neighbors
        
        for (y in 0 until height) {
            for (x in 0 until width) {
                val idx = y * width + x
                
                if (x == 0 || x == width - 1 || y == 0 || y == height - 1) {
                    // Keep edge pixels unchanged
                    result[idx] = pixels[idx]
                    continue
                }
                
                // Get neighboring pixels
                val center = pixels[idx]
                val top = pixels[idx - width]
                val bottom = pixels[idx + width]
                val left = pixels[idx - 1]
                val right = pixels[idx + 1]
                
                // Apply sharpening to each channel
                val centerR = (center shr 16) and 0xFF
                val centerG = (center shr 8) and 0xFF
                val centerB = center and 0xFF
                
                val newR = (5 * centerR 
                    - ((top shr 16) and 0xFF)
                    - ((bottom shr 16) and 0xFF)
                    - ((left shr 16) and 0xFF)
                    - ((right shr 16) and 0xFF)).coerceIn(0, 255)
                    
                val newG = (5 * centerG
                    - ((top shr 8) and 0xFF)
                    - ((bottom shr 8) and 0xFF)
                    - ((left shr 8) and 0xFF)
                    - ((right shr 8) and 0xFF)).coerceIn(0, 255)
                    
                val newB = (5 * centerB
                    - (top and 0xFF)
                    - (bottom and 0xFF)
                    - (left and 0xFF)
                    - (right and 0xFF)).coerceIn(0, 255)
                
                result[idx] = (0xFF shl 24) or (newR shl 16) or (newG shl 8) or newB
            }
        }
        
        val outputBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        outputBitmap.setPixels(result, 0, width, 0, 0, width, height)
        return outputBitmap
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
