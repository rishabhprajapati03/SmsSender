package com.smssender.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.work.*
import com.facebook.react.bridge.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class SmsSyncModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val PREFS_NAME = "sms_sync_prefs"
        private const val KEY_ENABLED = "sync_enabled"
        private const val KEY_SYNC_START_TS = "sync_start_timestamp"
    }

    override fun getName(): String = "SmsSyncModule"

    @ReactMethod
    fun checkRequiredPermissions(promise: Promise) {
        try {
            val readSms = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.READ_SMS
            ) == PackageManager.PERMISSION_GRANTED

            val receiveSms = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.RECEIVE_SMS
            ) == PackageManager.PERMISSION_GRANTED

            val postNotifications = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }

            val result = Arguments.createMap().apply {
                putBoolean("readSms", readSms)
                putBoolean("receiveSms", receiveSms)
                putBoolean("postNotifications", postNotifications)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PERMISSION_CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun validatePermissionsAndAutoDisable(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val enabled = prefs.getBoolean(KEY_ENABLED, false)

            if (enabled && !PermissionUtils.hasAllRequiredPermissions(reactApplicationContext)) {
                // Permissions missing but sync was enabled - auto-disable
                prefs.edit()
                    .putBoolean(KEY_ENABLED, false)
                    .putLong(KEY_SYNC_START_TS, 0L)
                    .apply()

                // Stop foreground service
                SmsForegroundService.stop(reactApplicationContext)

                // Cancel WorkManager
                WorkManager.getInstance(reactApplicationContext).cancelUniqueWork("sms_upload")

                val result = Arguments.createMap().apply {
                    putBoolean("autoDisabled", true)
                }
                promise.resolve(result)
            } else {
                val result = Arguments.createMap().apply {
                    putBoolean("autoDisabled", false)
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            // Do NOT crash - return safe default
            val result = Arguments.createMap().apply {
                putBoolean("autoDisabled", false)
            }
            promise.resolve(result)
        }
    }

    @ReactMethod
    fun enableSync(promise: Promise) {
        try {
            if (!PermissionUtils.hasAllRequiredPermissions(reactApplicationContext)) {
                promise.reject("PERMISSION_DENIED", "Required permissions not granted")
                return
            }

            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()

            prefs.edit()
                .putBoolean(KEY_ENABLED, true)
                .putLong(KEY_SYNC_START_TS, now)
                .apply()

            // Start foreground service
            SmsForegroundService.start(reactApplicationContext)

            // Trigger immediate upload if there are pending messages
            triggerUpload()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ENABLE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun disableSync(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            prefs.edit()
                .putBoolean(KEY_ENABLED, false)
                .putLong(KEY_SYNC_START_TS, 0L)
                .apply()

            // Cancel upload work
            WorkManager.getInstance(reactApplicationContext).cancelUniqueWork("sms_upload")

            // Stop foreground service
            SmsForegroundService.stop(reactApplicationContext)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISABLE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isSyncEnabled(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val enabled = prefs.getBoolean(KEY_ENABLED, false)
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun ensureServiceRunning(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val enabled = prefs.getBoolean(KEY_ENABLED, false)

            if (enabled && PermissionUtils.hasAllRequiredPermissions(reactApplicationContext)) {
                SmsForegroundService.start(reactApplicationContext)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ENSURE_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getQueue(promise: Promise) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val queue = withContext(Dispatchers.IO) {
                    val db = SmsDatabase.getInstance(reactApplicationContext)
                    db.smsDao().getAll()
                }

                val array = Arguments.createArray()
                for (sms in queue) {
                    val map = Arguments.createMap().apply {
                        putString("id", sms.id)
                        putString("sender", sms.sender)
                        putString("body", sms.body)
                        putDouble("timestamp", sms.timestamp.toDouble())
                        putString("status", sms.status)
                        putInt("retryCount", sms.retryCount)
                        putString("lastError", sms.lastError)
                        putDouble("createdAt", sms.createdAt.toDouble())
                        sms.lastTriedAt?.let { putDouble("lastTriedAt", it.toDouble()) }
                        sms.syncedAt?.let { putDouble("syncedAt", it.toDouble()) }
                        sms.nextRetryAt?.let { putDouble("nextRetryAt", it.toDouble()) }
                    }
                    array.pushMap(map)
                }

                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("QUEUE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getQueueStats(promise: Promise) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val stats = withContext(Dispatchers.IO) {
                    val db = SmsDatabase.getInstance(reactApplicationContext)
                    val dao = db.smsDao()

                    mapOf(
                        "total" to dao.getAll().size,
                        "pending" to dao.countByStatus("pending"),
                        "syncing" to dao.countByStatus("syncing"),
                        "sent" to dao.countByStatus("sent"),
                        "failed" to dao.countByStatus("failed")
                    )
                }

                val map = Arguments.createMap().apply {
                    putInt("total", stats["total"] ?: 0)
                    putInt("pending", stats["pending"] ?: 0)
                    putInt("syncing", stats["syncing"] ?: 0)
                    putInt("sent", stats["sent"] ?: 0)
                    putInt("failed", stats["failed"] ?: 0)
                }

                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("STATS_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun addToQueue(id: String, sender: String, body: String, timestamp: Double, promise: Promise) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                withContext(Dispatchers.IO) {
                    val db = SmsDatabase.getInstance(reactApplicationContext)
                    val sms = SmsEntity(
                        id = id,
                        sender = sender,
                        body = body,
                        timestamp = timestamp.toLong(),
                        status = "pending"
                    )
                    db.smsDao().insert(sms)
                }

                // Trigger upload
                triggerUpload()

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ADD_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun triggerUpload(promise: Promise) {
        try {
            triggerUpload()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TRIGGER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearQueue(promise: Promise) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                withContext(Dispatchers.IO) {
                    val db = SmsDatabase.getInstance(reactApplicationContext)
                    db.smsDao().deleteAll()
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("CLEAR_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun clearSentMessages(promise: Promise) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val removed = withContext(Dispatchers.IO) {
                    val db = SmsDatabase.getInstance(reactApplicationContext)
                    db.smsDao().deleteSent(1000)
                }
                promise.resolve(removed)
            } catch (e: Exception) {
                promise.reject("CLEAR_SENT_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun saveApiConfig(url: String, key: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("app_config", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("supabase_url", url)
                .putString("supabase_key", key)
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CONFIG_ERROR", e.message, e)
        }
    }



    private fun triggerUpload() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val uploadRequest = OneTimeWorkRequestBuilder<SmsWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()

        WorkManager.getInstance(reactApplicationContext)
            .enqueueUniqueWork(
                "sms_upload",
                ExistingWorkPolicy.KEEP,
                uploadRequest
            )
    }
}
