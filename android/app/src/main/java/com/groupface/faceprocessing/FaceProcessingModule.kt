package com.groupface.faceprocessing

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.PointF
import android.util.Log
import com.facebook.react.bridge.*
import kotlin.math.atan2
import kotlin.math.sqrt
import kotlin.math.abs
import androidx.exifinterface.media.ExifInterface

class FaceProcessingModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val TAG = "FaceProcessingModule"
    
    // Quality thresholds
    private val MIN_FACE_SIZE = 25  // minimum face width/height in pixels
    private val MAX_HEAD_ROTATION = 35f  // max degrees (looking too far left/right)
    private val MAX_HEAD_TILT = 25f  // max degrees (head tilted)

    private val faceDetector = FaceDetectionModule()
    private val faceEmbedder = FaceEmbeddingModule(reactContext)

    override fun getName(): String = "FaceProcessingModule"

    @ReactMethod
    fun processImageFromUri(uri: String, promise: Promise) {
        try {
            val filePath = if (uri.startsWith("file://")) {
                uri.removePrefix("file://")
            } else uri

            var bitmap = BitmapFactory.decodeFile(filePath)
                ?: return promise.reject("DECODE_ERROR", "Failed to decode image")
            
            // Fix EXIF orientation (critical for selfies!)
            bitmap = correctBitmapOrientation(filePath, bitmap)

            val detectedFaces = faceDetector.detectFacesWithLandmarks(bitmap)

            if (detectedFaces.isEmpty()) {
                promise.resolve(Arguments.createArray())
                return
            }

            val result = Arguments.createArray()

            for (face in detectedFaces) {
                val box = face.boundingBox
                val left = box.left.toInt().coerceAtLeast(0)
                val top = box.top.toInt().coerceAtLeast(0)
                val width = box.width.toInt().coerceAtMost(bitmap.width - left)
                val height = box.height.toInt().coerceAtMost(bitmap.height - top)

                if (width <= 0 || height <= 0) continue
                
                // Quality filter: skip small faces
                if (width < MIN_FACE_SIZE || height < MIN_FACE_SIZE) {
                    Log.d(TAG, "Skipping small face: ${width}x${height}")
                    continue
                }
                
                // Quality filter: skip extreme head poses
                if (abs(face.headEulerAngleY) > MAX_HEAD_ROTATION) {
                    Log.d(TAG, "Skipping face with extreme Y rotation: ${face.headEulerAngleY}")
                    continue
                }
                if (abs(face.headEulerAngleZ) > MAX_HEAD_TILT) {
                    Log.d(TAG, "Skipping face with extreme Z rotation: ${face.headEulerAngleZ}")
                    continue
                }

                // Crop face with padding for alignment
                val padding = (width * 0.3f).toInt()
                val padLeft = (left - padding).coerceAtLeast(0)
                val padTop = (top - padding).coerceAtLeast(0)
                val padRight = (left + width + padding).coerceAtMost(bitmap.width)
                val padBottom = (top + height + padding).coerceAtMost(bitmap.height)
                
                val paddedCrop = Bitmap.createBitmap(
                    bitmap, 
                    padLeft, 
                    padTop, 
                    padRight - padLeft, 
                    padBottom - padTop
                )

                // Align face using eye landmarks if available
                val alignedFace = if (face.leftEye != null && face.rightEye != null) {
                    alignFace(paddedCrop, face.leftEye, face.rightEye, padLeft, padTop)
                } else {
                    // Fall back to simple crop without alignment
                    Bitmap.createBitmap(bitmap, left, top, width, height)
                }

                val embedding = faceEmbedder.getEmbedding(alignedFace)

                if (embedding != null) {
                    val map = Arguments.createMap()

                    val embeddingArray = Arguments.createArray()
                    embedding.forEach { value ->
                        embeddingArray.pushDouble(value.toDouble())
                    }

                    map.putArray("embedding", embeddingArray)

                    val boxMap = Arguments.createMap()
                    boxMap.putDouble("left", box.left.toDouble())
                    boxMap.putDouble("top", box.top.toDouble())
                    boxMap.putDouble("width", box.width.toDouble())
                    boxMap.putDouble("height", box.height.toDouble())

                    map.putMap("boundingBox", boxMap)
                    map.putInt("imageWidth", bitmap.width)
                    map.putInt("imageHeight", bitmap.height)
                    
                    // Calculate quality score: larger face + more frontal = better
                    val sizeScore = (width * height).toDouble() / 10000.0  // Normalize face area
                    val poseScore = 1.0 - (abs(face.headEulerAngleY) + abs(face.headEulerAngleZ)) / 90.0
                    val qualityScore = sizeScore * 0.6 + poseScore * 0.4
                    map.putDouble("qualityScore", qualityScore)

                    result.pushMap(map)
                }
            }

            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "processImageFromUri error", e)
            promise.reject("PROCESS_ERROR", e.message, e)
        }
    }
    
    /**
     * Align face by rotating so eyes are horizontal and scaling to standard size.
     * This normalizes face orientation regardless of how the photo was taken.
     */
    private fun alignFace(
        paddedCrop: Bitmap,
        leftEye: PointF,
        rightEye: PointF,
        cropOffsetX: Int,
        cropOffsetY: Int
    ): Bitmap {
        // Convert eye coordinates to crop-local coordinates
        val localLeftEye = PointF(leftEye.x - cropOffsetX, leftEye.y - cropOffsetY)
        val localRightEye = PointF(rightEye.x - cropOffsetX, rightEye.y - cropOffsetY)
        
        // Calculate angle between eyes
        val dx = localRightEye.x - localLeftEye.x
        val dy = localRightEye.y - localLeftEye.y
        val angle = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
        
        // Calculate eye center (pivot point for rotation)
        val eyeCenterX = (localLeftEye.x + localRightEye.x) / 2f
        val eyeCenterY = (localLeftEye.y + localRightEye.y) / 2f
        
        // Calculate eye distance to determine scale
        val eyeDistance = sqrt(dx * dx + dy * dy)
        
        // Target: eyes should be ~40% of face width apart in output
        val targetEyeDistance = 160 * 0.4f  // 64 pixels for 160x160 output
        val scale = targetEyeDistance / eyeDistance
        
        // Create transformation matrix
        val matrix = Matrix()
        matrix.postTranslate(-eyeCenterX, -eyeCenterY)
        matrix.postRotate(-angle)
        matrix.postScale(scale, scale)
        matrix.postTranslate(80f, 70f)  // Position eyes at standard location in 160x160
        
        // Create aligned 160x160 bitmap (FaceNet input size)
        val aligned = Bitmap.createBitmap(160, 160, Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(aligned)
        canvas.drawColor(android.graphics.Color.BLACK)  // Fill with black for any gaps
        canvas.drawBitmap(paddedCrop, matrix, null)
        
        return aligned
    }
    
    /**
     * Correct bitmap orientation based on EXIF data.
     * Essential for selfies and photos with rotation metadata.
     */
    private fun correctBitmapOrientation(filePath: String, bitmap: Bitmap): Bitmap {
        return try {
            val exif = ExifInterface(filePath)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            
            val matrix = Matrix()
            when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
                ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
                ExifInterface.ORIENTATION_TRANSPOSE -> {
                    matrix.postRotate(90f)
                    matrix.preScale(-1f, 1f)
                }
                ExifInterface.ORIENTATION_TRANSVERSE -> {
                    matrix.postRotate(-90f)
                    matrix.preScale(-1f, 1f)
                }
                else -> return bitmap // No rotation needed
            }
            
            Log.d(TAG, "Correcting EXIF orientation: $orientation")
            Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading EXIF: ${e.message}")
            bitmap
        }
    }
}