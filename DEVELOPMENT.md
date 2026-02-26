# Development Guide

## Quick Reference Commands

### Build & Run
```bash
# Install dependencies
npm install

# Clean Android build
cd android && ./gradlew clean && cd ..

# Run on Android
npm run android

# Start Metro bundler
npm start
```

### Debugging

#### View Logs
```bash
# All logs
adb logcat

# SMS Sync Module
adb logcat | grep SmsSyncModule

# SMS Receiver
adb logcat | grep SmsReceiver

# SMS Worker
adb logcat | grep SmsWorker

# Boot Receiver
adb logcat | grep BootReceiver

# Foreground Service
adb logcat | grep SmsForegroundService
```

#### Check Sync State
```bash
# View SharedPreferences
adb shell run-as com.smssender cat shared_prefs/sms_sync_prefs.xml

# View App Config
adb shell run-as com.smssender cat shared_prefs/app_config.xml
```

#### Check WorkManager
```bash
# View scheduled jobs
adb shell dumpsys jobscheduler | grep com.smssender

# View WorkManager status
adb shell dumpsys activity service WorkManagerService
```

#### Database
```bash
# Access Room database
adb shell run-as com.smssender
cd databases
sqlite3 sms_database

# Query messages
SELECT * FROM sms_queue;
SELECT COUNT(*) FROM sms_queue WHERE status = 'pending';
```

### Testing

#### Test SMS Reception
```bash
# Send test SMS to emulator
adb emu sms send +1234567890 "Test message"

# Send multiple test SMS
for i in {1..5}; do adb emu sms send +1234567890 "Test $i"; done
```

#### Test Permissions
```bash
# Revoke SMS permission
adb shell pm revoke com.smssender android.permission.READ_SMS
adb shell pm revoke com.smssender android.permission.RECEIVE_SMS

# Grant SMS permission
adb shell pm grant com.smssender android.permission.READ_SMS
adb shell pm grant com.smssender android.permission.RECEIVE_SMS

# Revoke notification permission (Android 13+)
adb shell pm revoke com.smssender android.permission.POST_NOTIFICATIONS

# Grant notification permission (Android 13+)
adb shell pm grant com.smssender android.permission.POST_NOTIFICATIONS
```

#### Test Reboot
```bash
# Reboot device/emulator
adb reboot

# After reboot, check if service restored
adb logcat | grep BootReceiver
```

#### Clear App Data
```bash
# Clear all app data
adb shell pm clear com.smssender

# Uninstall app
adb uninstall com.smssender
```

## Architecture Details

### Permission Flow

#### Centralized Permission Check
```kotlin
// PermissionUtils.kt - Single source of truth
object PermissionUtils {
    fun hasAllRequiredPermissions(context: Context): Boolean {
        // Checks READ_SMS, RECEIVE_SMS, POST_NOTIFICATIONS
        return readSms && receiveSms && postNotifications
    }
}
```

#### Used By
- `SmsSyncModule.enableSync()` - Before enabling sync
- `SmsSyncModule.ensureServiceRunning()` - Before starting service
- `SmsSyncModule.importExistingSms()` - Before importing
- `BootReceiver.onReceive()` - Before restoring service

#### Runtime Validation
```kotlin
// SmsSyncModule.kt
@ReactMethod
fun validatePermissionsAndAutoDisable(promise: Promise) {
    if (enabled && !PermissionUtils.hasAllRequiredPermissions(context)) {
        // Auto-disable sync
        // Stop service
        // Cancel WorkManager
        return { autoDisabled: true }
    }
}
```

### Data Models

#### SmsEntity (Room)
```kotlin
@Entity(tableName = "sms_queue")
data class SmsEntity(
    @PrimaryKey val id: String,           // Unique ID
    val sender: String,                    // Phone number
    val body: String,                      // Message text
    val timestamp: Long,                   // SMS timestamp
    val status: String,                    // pending/syncing/sent/failed
    val retryCount: Int = 0,              // Retry attempts
    val lastError: String = "",           // Last error message
    val createdAt: Long = System.currentTimeMillis(),
    val lastTriedAt: Long? = null,        // Last upload attempt
    val syncedAt: Long? = null,           // Upload success time
    val nextRetryAt: Long? = null         // Next retry time
)
```

#### Status Values
- `pending` - Waiting to be uploaded
- `syncing` - Currently being uploaded
- `sent` - Successfully uploaded
- `failed` - Upload failed, will retry

### WorkManager Configuration

#### Constraints
```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)  // Only when online
    .build()
```

#### Backoff Policy
```kotlin
.setBackoffCriteria(
    BackoffPolicy.EXPONENTIAL,           // Exponential backoff
    WorkRequest.MIN_BACKOFF_MILLIS,      // 10 seconds minimum
    TimeUnit.MILLISECONDS
)
```

#### Retry Calculation
```kotlin
private fun calculateBackoff(retryCount: Int): Long {
    val baseDelay = 60000L              // 1 minute
    val maxDelay = 6 * 60 * 60 * 1000L  // 6 hours
    return min(baseDelay * 2.0.pow(retryCount.toDouble()).toLong(), maxDelay)
}
```

#### Retry Schedule
- Retry 1: 1 minute
- Retry 2: 2 minutes
- Retry 3: 4 minutes
- Retry 4: 8 minutes
- Retry 5: 16 minutes
- Retry 6+: 6 hours (max)

### API Integration

#### Supabase Upload
```kotlin
// POST to /rest/v1/sms_logs
val url = "$baseUrl/rest/v1/sms_logs"

// Headers
"apikey": anonKey
"Authorization": "Bearer $anonKey"
"Content-Type": "application/json"
"Prefer": "resolution=merge-duplicates,return=minimal"

// Body (batch)
[
  {
    "sms_uid": "device_123_456_1234567890",
    "sender": "+1234567890",
    "body": "Message text",
    "timestamp": 1234567890,
    "device_id": "device_123",
    "status": "received"
  }
]
```

#### Response Handling
- `200-299` - Success
- `409` - Conflict (duplicate, treated as success)
- `400-499` - Client error (permanent failure, no retry)
- `500-599` - Server error (retry with backoff)

### State Management

#### SharedPreferences Keys
```kotlin
// sms_sync_prefs
"sync_enabled"        // Boolean - Is sync enabled
"sync_start_timestamp" // Long - When sync was enabled

// app_config
"supabase_url"        // String - API base URL
"supabase_key"        // String - API key
"device_id"           // String - Unique device identifier
```

#### Device ID Generation
```kotlin
// Generated once, persisted forever
"device_${System.currentTimeMillis()}_${random}"
```

### Duplicate Prevention

#### Room Unique Constraint
```kotlin
@Entity(tableName = "sms_queue")
data class SmsEntity(
    @PrimaryKey val id: String  // Unique constraint
)
```

#### Insert Strategy
```kotlin
@Insert(onConflict = OnConflictStrategy.IGNORE)
suspend fun insert(sms: SmsEntity): Long
// Returns 0 if duplicate, > 0 if inserted
```

#### ID Generation
```kotlin
// From SmsReceiver
val id = "${sender}_${timestamp}"

// From Manual Import
val id = "imported_${smsId}_${timestamp}"
```

### Error Handling

#### Graceful Degradation
```kotlin
// Never crash, always return safe default
try {
    // Operation
} catch (e: Exception) {
    Log.e(TAG, "Error", e)
    return safeDefault
}
```

#### User Feedback
```typescript
// Show clear alerts
Alert.alert(
  'SMS Sync Disabled',
  'SMS Sync was automatically disabled because required permissions were revoked.',
  [{ text: 'OK' }]
);
```

## Common Issues & Solutions

### Issue: SMS Not Queuing

**Symptoms:**
- SMS received but not in queue
- No logs from SmsReceiver

**Check:**
```bash
# 1. Verify sync enabled
adb shell run-as com.smssender cat shared_prefs/sms_sync_prefs.xml | grep sync_enabled

# 2. Check permissions
adb shell dumpsys package com.smssender | grep permission

# 3. View receiver logs
adb logcat | grep SmsReceiver
```

**Solutions:**
- Enable sync in Dashboard
- Grant READ_SMS and RECEIVE_SMS permissions
- Check timestamp filter (SMS must be after sync enabled)

### Issue: Upload Not Working

**Symptoms:**
- Messages stuck in "pending" status
- No logs from SmsWorker

**Check:**
```bash
# 1. Check WorkManager
adb shell dumpsys jobscheduler | grep com.smssender

# 2. Check network
adb shell dumpsys connectivity

# 3. View worker logs
adb logcat | grep SmsWorker
```

**Solutions:**
- Ensure device has internet connection
- Verify Supabase URL and key in Settings
- Check API endpoint is accessible
- Manually trigger: `SmsSyncBridge.triggerUpload()`

### Issue: Service Not Starting After Reboot

**Symptoms:**
- No notification after reboot
- Sync appears enabled but not working

**Check:**
```bash
# 1. Check BootReceiver logs
adb logcat | grep BootReceiver

# 2. Check permissions
adb shell dumpsys package com.smssender | grep permission

# 3. Check sync state
adb shell run-as com.smssender cat shared_prefs/sms_sync_prefs.xml
```

**Solutions:**
- Ensure permissions still granted after reboot
- Check sync was enabled before reboot
- Manually call: `SmsSyncBridge.ensureServiceRunning()`

### Issue: Duplicate Messages

**Symptoms:**
- Same SMS appears multiple times in queue
- Multiple uploads of same message

**Check:**
```bash
# Query database for duplicates
adb shell run-as com.smssender
cd databases
sqlite3 sms_database
SELECT id, COUNT(*) FROM sms_queue GROUP BY id HAVING COUNT(*) > 1;
```

**Solutions:**
- Should NOT happen (Room IGNORE strategy)
- If happens, check ID generation logic
- Clear queue and re-import

### Issue: Permission Auto-Disable Not Working

**Symptoms:**
- Permissions revoked but sync still enabled
- Service running without permissions

**Check:**
```bash
# 1. Check validation called
adb logcat | grep validatePermissionsAndAutoDisable

# 2. Check app initialization
adb logcat | grep appInitializer
```

**Solutions:**
- Ensure `validatePermissionsAndAutoDisable()` called in appInitializer
- Restart app to trigger validation
- Manually toggle sync OFF then ON

## Performance Optimization

### Batch Size Tuning
```kotlin
// SmsWorker.kt
private const val BATCH_SIZE = 20  // Adjust based on API limits
```

**Considerations:**
- Smaller batches: More API calls, slower overall
- Larger batches: Fewer API calls, but longer per-request
- Recommended: 20-50 messages per batch

### Database Queries
```kotlin
// Efficient query with limit
@Query("SELECT * FROM sms_queue WHERE status = 'pending' LIMIT :limit")
suspend fun getPending(limit: Int): List<SmsEntity>

// Index on status for faster queries
@Entity(
    tableName = "sms_queue",
    indices = [Index(value = ["status"])]
)
```

### Memory Management
```kotlin
// Use cursor for large imports
cursor?.use {
    while (it.moveToNext()) {
        // Process one at a time
    }
}
// Cursor auto-closed
```

## Security Best Practices

### API Key Storage
```kotlin
// Store in native SharedPreferences (not JS AsyncStorage)
val prefs = context.getSharedPreferences("app_config", Context.MODE_PRIVATE)
prefs.edit()
    .putString("supabase_key", key)
    .apply()
```

### Permission Validation
```kotlin
// Always validate before sensitive operations
if (!PermissionUtils.hasAllRequiredPermissions(context)) {
    return // Abort operation
}
```

### Data Sanitization
```kotlin
// Sanitize SMS data before upload
val sender = sms.sender ?: "unknown"
val body = sms.body ?: ""
```

## Testing Checklist

### Manual Testing
- [ ] Enable sync with permissions granted
- [ ] Enable sync with permissions denied
- [ ] Receive SMS while sync enabled
- [ ] Receive SMS while sync disabled
- [ ] Manual import with permissions
- [ ] Manual import without permissions
- [ ] Toggle sync ON/OFF multiple times
- [ ] Restart app with sync enabled
- [ ] Restart app with sync disabled
- [ ] Reboot device with sync enabled
- [ ] Reboot device with sync disabled
- [ ] Revoke permissions while sync enabled
- [ ] Grant permissions after revoked
- [ ] Network disconnected during upload
- [ ] Network reconnected after failure
- [ ] Clear queue
- [ ] Clear sent messages
- [ ] View queue statistics

### Automated Testing
```bash
# Run unit tests
cd android && ./gradlew test

# Run instrumented tests
cd android && ./gradlew connectedAndroidTest
```

## Deployment

### Build Release APK
```bash
cd android
./gradlew assembleRelease
```

### Build Release AAB (Play Store)
```bash
cd android
./gradlew bundleRelease
```

### Signing Configuration
```gradle
// android/app/build.gradle
signingConfigs {
    release {
        storeFile file('your-keystore.jks')
        storePassword 'your-store-password'
        keyAlias 'your-key-alias'
        keyPassword 'your-key-password'
    }
}
```

## Monitoring & Analytics

### Key Metrics to Track
- SMS received count
- SMS uploaded count
- Upload success rate
- Upload failure rate
- Average upload time
- Queue size over time
- Permission denial rate
- Auto-disable frequency

### Logging Best Practices
```kotlin
// Use appropriate log levels
Log.d(TAG, "Debug info")      // Development only
Log.i(TAG, "Info message")    // General info
Log.w(TAG, "Warning")         // Potential issues
Log.e(TAG, "Error", exception) // Errors with stack trace
```

## Contributing

### Code Style
- Follow Kotlin coding conventions
- Use TypeScript for all JS code
- Add comments for complex logic
- Write descriptive commit messages

### Pull Request Process
1. Create feature branch
2. Make changes
3. Test thoroughly
4. Update documentation
5. Submit PR with description

## Support

For questions or issues:
1. Check this documentation
2. Search existing issues
3. Create new issue with details
4. Include logs and steps to reproduce
