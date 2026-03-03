package com.groupface.faceprocessing

import android.graphics.Bitmap
import android.graphics.PointF
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.face.FaceLandmark

data class DetectedFace(
    val boundingBox: BoundingBox,
    val leftEye: PointF?,
    val rightEye: PointF?,
    val headEulerAngleY: Float,  // rotation around vertical axis (looking left/right)
    val headEulerAngleZ: Float   // rotation around forward axis (tilting head)
)

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

    fun detectFaces(bitmap: Bitmap): List<BoundingBox> {
        return detectFacesWithLandmarks(bitmap).map { it.boundingBox }
    }

    fun detectFacesWithLandmarks(bitmap: Bitmap): List<DetectedFace> {
        return try {
            val image = InputImage.fromBitmap(bitmap, 0)
            val task = faceDetector.process(image)
            val detectedFaces = Tasks.await(task)

            Log.d(TAG, "Detected ${detectedFaces.size} faces")

            detectedFaces.map { face ->
                val leftEye = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
                val rightEye = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position
                
                DetectedFace(
                    boundingBox = BoundingBox(
                        left = face.boundingBox.left.toFloat(),
                        top = face.boundingBox.top.toFloat(),
                        width = face.boundingBox.width().toFloat(),
                        height = face.boundingBox.height().toFloat()
                    ),
                    leftEye = leftEye,
                    rightEye = rightEye,
                    headEulerAngleY = face.headEulerAngleY,
                    headEulerAngleZ = face.headEulerAngleZ
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error detecting faces: ${e.message}", e)
            emptyList()
        }
    }

    fun release() {
        try {
            faceDetector.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing detector: ${e.message}")
        }
    }
}