package com.smssender.sms

import androidx.room.*

@Dao
interface SmsDao {
    @Query("SELECT * FROM sms_queue ORDER BY createdAt DESC")
    suspend fun getAll(): List<SmsEntity>

    @Query("SELECT * FROM sms_queue WHERE status IN ('pending', 'failed') AND (nextRetryAt IS NULL OR nextRetryAt <= :now) ORDER BY createdAt ASC LIMIT :limit")
    suspend fun getPending(now: Long, limit: Int): List<SmsEntity>

    @Query("SELECT COUNT(*) FROM sms_queue WHERE status = :status")
    suspend fun countByStatus(status: String): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(sms: SmsEntity): Long

    @Update
    suspend fun update(sms: SmsEntity)

    @Query("UPDATE sms_queue SET status = :status, lastTriedAt = :now WHERE id IN (:ids)")
    suspend fun updateStatus(ids: List<String>, status: String, now: Long)

    @Query("UPDATE sms_queue SET status = 'sent', syncedAt = :now WHERE id IN (:ids)")
    suspend fun markAsSent(ids: List<String>, now: Long)

    @Query("UPDATE sms_queue SET status = 'failed', retryCount = retryCount + 1, lastError = :error, nextRetryAt = :nextRetry WHERE id = :id")
    suspend fun markAsFailed(id: String, error: String, nextRetry: Long)

   @Query("""
DELETE FROM sms_queue 
WHERE id IN (
    SELECT id FROM sms_queue 
    WHERE status = 'sent' 
    ORDER BY createdAt ASC 
    LIMIT :limit
)
""")
suspend fun deleteSent(limit: Int): Int
    @Query("DELETE FROM sms_queue")
    suspend fun deleteAll()

    @Query("""
        UPDATE sms_queue 
        SET status = 'pending', lastError = 'Recovered from stale syncing' 
        WHERE status = 'syncing' AND lastTriedAt < :staleThreshold
    """)
    suspend fun recoverStaleSyncing(staleThreshold: Long): Int
}
