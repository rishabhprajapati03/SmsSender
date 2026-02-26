package com.smssender.sms

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sms_queue")
data class SmsEntity(
    @PrimaryKey
    val id: String,
    val sender: String,
    val body: String,
    val timestamp: Long,
    val status: String, // pending, syncing, sent, failed
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val lastTriedAt: Long? = null,
    val syncedAt: Long? = null,
    val nextRetryAt: Long? = null
)
