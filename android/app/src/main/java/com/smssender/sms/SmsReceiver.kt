package com.smssender.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.util.Log
import androidx.work.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class SmsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "SmsReceiver"
        private const val PREFS_NAME = "sms_sync_prefs"
        private const val KEY_ENABLED = "sync_enabled"
        private const val KEY_SYNC_START_TS = "sync_start_timestamp"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val enabled = prefs.getBoolean(KEY_ENABLED, false)

        if (!enabled) {
            Log.d(TAG, "Sync disabled, ignoring SMS")
            return
        }

        val syncStartTs = prefs.getLong(KEY_SYNC_START_TS, 0L)
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)

        if (messages.isEmpty()) {
            Log.w(TAG, "No messages in intent")
            return
        }

        val pendingResult = goAsync()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val db = SmsDatabase.getInstance(context)
                val dao = db.smsDao()

                for (msg in messages) {
                    val timestamp = msg.timestampMillis

                    // Ignore SMS before sync was enabled
                    if (syncStartTs > 0 && timestamp < syncStartTs) {
                        Log.d(TAG, "SMS before sync start, skipping")
                        continue
                    }

                    val smsId = "${msg.originatingAddress}_${timestamp}"
                    val sms = SmsEntity(
                        id = smsId,
                        sender = msg.originatingAddress ?: "unknown",
                        body = msg.messageBody ?: "",
                        timestamp = timestamp,
                        status = "pending"
                    )

                    val inserted = dao.insert(sms)
                    if (inserted > 0) {
                        Log.d(TAG, "SMS queued: $smsId")
                    } else {
                        Log.d(TAG, "SMS duplicate, skipped: $smsId")
                    }
                }

                // Schedule WorkManager to process queue
                scheduleUploadWork(context)

            } catch (e: Exception) {
                Log.e(TAG, "Error processing SMS", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun scheduleUploadWork(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val uploadRequest = OneTimeWorkRequestBuilder<SmsWorker>()
            .setConstraints(constraints)
            .setInitialDelay(5, TimeUnit.SECONDS)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()

        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                "sms_upload",
                ExistingWorkPolicy.KEEP,
                uploadRequest
            )
    }
}
