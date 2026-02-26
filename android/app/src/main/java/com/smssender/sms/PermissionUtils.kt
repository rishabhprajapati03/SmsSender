package com.smssender.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

object PermissionUtils {
    
    fun hasAllRequiredPermissions(context: Context): Boolean {
        val readSms = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED

        val receiveSms = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED

        val postNotifications = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        return readSms && receiveSms && postNotifications
    }
}
