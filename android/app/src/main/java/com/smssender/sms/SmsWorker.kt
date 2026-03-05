package com.smssender.sms

import android.content.Context
import android.util.Log
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.min
import kotlin.math.pow

class SmsWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "SmsWorker"
        private const val BATCH_SIZE = 20
        private const val TIMEOUT_MS = 30000
        private const val PREFS_NAME = "sms_sync_prefs"
        private const val KEY_DEVICE_ID = "device_id"
        private const val STALE_SYNCING_THRESHOLD_MS = 5 * 60 * 1000L // 5 minutes
    }

  override suspend fun doWork(): Result {
    try {
        Log.d(TAG, "Starting SMS upload work")

        val db = SmsDatabase.getInstance(applicationContext)
        val dao = db.smsDao()

        // Recover messages stuck in "syncing" due to process death
        val staleThreshold = System.currentTimeMillis() - STALE_SYNCING_THRESHOLD_MS
        val recovered = dao.recoverStaleSyncing(staleThreshold)
        if (recovered > 0) {
            Log.w(TAG, "Recovered $recovered messages stuck in syncing")
        }

        val deviceId = getDeviceId()

        var totalProcessed = 0

        while (true) {

            val now = System.currentTimeMillis()
            val batch = dao.getPending(now, BATCH_SIZE)

            if (batch.isEmpty()) {
                Log.d(TAG, "No more pending messages. Total processed: $totalProcessed")
                return Result.success()
            }

            Log.d(TAG, "Processing batch: ${batch.size} messages")

            val ids = batch.map { it.id }
            dao.updateStatus(ids, "syncing", now)

            val success = uploadBatch(batch, deviceId)

            if (success) {
                dao.markAsSent(ids, System.currentTimeMillis())
                totalProcessed += batch.size
            } else {
                for (sms in batch) {
                    val backoff = calculateBackoff(sms.retryCount + 1)
                    dao.markAsFailed(
                        sms.id,
                        "Upload failed",
                        System.currentTimeMillis() + backoff
                    )
                }
                return Result.retry()
            }
        }

    } catch (e: Exception) {
        Log.e(TAG, "Worker error", e)
        return Result.retry()
    }
}

    private fun uploadBatch(batch: List<SmsEntity>, deviceId: String): Boolean {
        return try {
            val prefs = applicationContext.getSharedPreferences("app_config", Context.MODE_PRIVATE)
            val baseUrl = prefs.getString("supabase_url", "") ?: ""
            val anonKey = prefs.getString("supabase_key", "") ?: ""

            if (baseUrl.isEmpty() || anonKey.isEmpty()) {
                Log.e(TAG, "Missing API configuration")
                return false
            }

            val url = URL("$baseUrl/rest/v1/sms_logs")
            val connection = url.openConnection() as HttpURLConnection

            connection.requestMethod = "POST"
            connection.setRequestProperty("apikey", anonKey)
            connection.setRequestProperty("Authorization", "Bearer $anonKey")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Prefer", "resolution=merge-duplicates,return=minimal")
            connection.connectTimeout = TIMEOUT_MS
            connection.readTimeout = TIMEOUT_MS
            connection.doOutput = true

            val jsonArray = JSONArray()
            for (sms in batch) {
                val smsUid = "${deviceId}_${sms.id}_${sms.timestamp}"
                val json = JSONObject().apply {
                    put("sms_uid", smsUid)
                    put("sender", sms.sender)
                    put("body", sms.body)
                    put("timestamp", sms.timestamp)
                    put("device_id", deviceId)
                    put("status", "received")
                }
                jsonArray.put(json)
            }

            connection.outputStream.use { os ->
                os.write(jsonArray.toString().toByteArray())
            }

            val responseCode = connection.responseCode
            Log.d(TAG, "API response: $responseCode")

            // Success or duplicate (409 conflict is OK for idempotent upsert)
            if (responseCode in 200..299 || responseCode == 409) {
                return true
            }

            // Client errors (4xx) - don't retry
            if (responseCode in 400..499 && responseCode != 409) {
                Log.e(TAG, "Permanent client error $responseCode")
                return false
            }

            false

        } catch (e: Exception) {
            Log.e(TAG, "Upload error", e)
            false
        }
    }

    private fun getDeviceId(): String {
        val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var deviceId = prefs.getString(KEY_DEVICE_ID, null)

        if (deviceId == null) {
            deviceId = "device_${System.currentTimeMillis()}_${(Math.random() * 1000000).toInt()}"
            prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
        }

        return deviceId
    }

    private fun calculateBackoff(retryCount: Int): Long {
        val baseDelay = 60000L // 1 minute
        val maxDelay = 6 * 60 * 60 * 1000L // 6 hours
        return min(baseDelay * 2.0.pow(retryCount.toDouble()).toLong(), maxDelay)
    }
}
