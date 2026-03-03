package com.groupface.directshare

import android.content.Intent
import android.net.Uri
import android.content.ClipData
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File

class DirectShareModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "DirectShare"

    @ReactMethod
    fun shareToApp(uris: ReadableArray, packageName: String, phone: String, promise: Promise) {
        try {
            val contentUris = ArrayList<Uri>()

            for (i in 0 until uris.size()) {
                val raw = uris.getString(i) ?: continue
                val uri: Uri = if (raw.startsWith("content://")) {
                    Uri.parse(raw)
                } else {
                    val file = File(Uri.parse(raw).path!!)
                    FileProvider.getUriForFile(
                        reactContext,
                        "${reactContext.packageName}.fileprovider",
                        file
                    )
                }
                contentUris.add(uri)
            }

            if (contentUris.isEmpty()) {
                promise.reject("NO_URIS", "No valid URIs provided")
                return
            }

            val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                type = "image/*"
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, contentUris)
                setPackage(packageName)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

                // WhatsApp-specific: pre-select a chat via jid
                if (packageName == "com.whatsapp" && phone.isNotEmpty()) {
                    putExtra("jid", "${phone}@s.whatsapp.net")
                }
                // (Telegram does not support chat pre-selection via intent extras)
            }

            for (uri in contentUris) {
                reactContext.grantUriPermission(
                    packageName,
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }

            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun shareViaEmail(uris: ReadableArray, email: String, promise: Promise) {
        try {
            val contentUris = ArrayList<Uri>()
            for (i in 0 until uris.size()) {
                val raw = uris.getString(i) ?: continue
                val uri: Uri = if (raw.startsWith("content://")) {
                    Uri.parse(raw)
                } else {
                    val file = File(Uri.parse(raw).path!!)
                    FileProvider.getUriForFile(reactContext, "${reactContext.packageName}.fileprovider", file)
                }
                contentUris.add(uri)
            }
            if (contentUris.isEmpty()) { promise.reject("NO_URIS", "No valid URIs"); return }

            val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                type = "image/jpeg"
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, contentUris)
                putExtra(Intent.EXTRA_EMAIL, arrayOf(email))
                putExtra(Intent.EXTRA_SUBJECT, "Photos from GroupFace")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                // ClipData is required for the system to grant read permission to the chosen app
                val clip = ClipData.newRawUri("", contentUris[0])
                for (i in 1 until contentUris.size) clip.addItem(ClipData.Item(contentUris[i]))
                clipData = clip
            }
            reactContext.startActivity(Intent.createChooser(intent, "Send via email").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e.message, e)
        }
    }
}
