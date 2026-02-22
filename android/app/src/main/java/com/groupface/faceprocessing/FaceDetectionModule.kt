package com.groupface.faceprocessing

import android.graphics.Bitmap
import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions

/**
 * Handles face detection using ML Kit
 * Returns bounding boxes for all detected faces in an image
 */
class FaceDetectionModule {
    private val faceDetector: FaceDetector
    private val TAG = "FaceDetectionModule"

    init {
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .build()

        faceDetector = FaceDetection.getClient(options)
    }

    /**
     * Detect all faces in a bitmap
     * @param bitmap Input image
     * @return List of bounding boxes
     */
    fun detectFaces(bitmap: Bitmap): List<BoundingBox> {
        return try {
            val image = InputImage.fromBitmap(bitmap)
            val detectedFaces = faceDetector.process(image).result

            Log.d(TAG, "Detected ${detectedFaces.size} faces")

            detectedFaces.map { face ->
                BoundingBox(
                    left = face.boundingBox.left.toFloat(),
                    top = face.boundingBox.top.toFloat(),
                    width = face.boundingBox.width().toFloat(),
                    height = face.boundingBox.height().toFloat()
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error detecting faces: ${e.message}", e)
            emptyList()
        }
    }

    /**
     * Close the detector resources
     */
    fun release() {
        try {
            faceDetector.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing detector: ${e.message}")
        }
    }
}