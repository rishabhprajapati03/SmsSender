package com.smssender.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
        private const val PREFS_NAME = "sms_sync_prefs"
        private const val KEY_ENABLED = "sync_enabled"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                Log.d(TAG, "Received: ${intent.action}")

                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val enabled = prefs.getBoolean(KEY_ENABLED, false)

                if (!enabled) {
                    Log.d(TAG, "Sync disabled, not starting service")
                    return
                }

                // Check all required permissions using centralized utility
                if (!PermissionUtils.hasAllRequiredPermissions(context)) {
                    Log.w(TAG, "Sync enabled but permissions missing, not starting service")
                    return
                }

                Log.d(TAG, "Sync enabled and permissions granted, restoring foreground service")
                SmsForegroundService.start(context)
            }
        }
    }
}
