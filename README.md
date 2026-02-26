# SMS Sender - React Native SMS Sync Application

## Overview

A production-ready React Native application for Android that automatically syncs SMS messages to a cloud backend (Supabase) using native Android components for reliability and compliance with Android 13/14 restrictions.

## Tech Stack

### Frontend
- **React Native 0.84** - Cross-platform mobile framework
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library (Stack + Bottom Tabs)
- **AsyncStorage** - Local data persistence
- **Axios** - HTTP client for API calls

### Backend/Native Android
- **Kotlin** - Modern Android development language
- **Room Database** - Local SQLite ORM for message queue
- **WorkManager** - Background task scheduling (Android Jetpack)
- **ForegroundService** - Persistent notification and app priority
- **BroadcastReceiver** - Incoming SMS capture
- **Telephony API** - Native SMS access

### Cloud Backend
- **Supabase** - PostgreSQL database and REST API
- **REST API** - Message upload endpoint

## Key Features

### 1. Automatic SMS Sync
- Captures incoming SMS messages in real-time
- Queues messages in local Room database
- Uploads to cloud via WorkManager
- Survives app restarts and device reboots
- Network-aware (only uploads when connected)

### 2. Manual SMS Import
- Import existing SMS from device inbox
- Native Telephony content provider query
- Batch processing with duplicate prevention
- Configurable limit (default: 500 messages)

### 3. Persistent Queue Management
- Room database for reliable storage
- Status tracking (pending, syncing, sent, failed)
- Automatic retry with exponential backoff
- Batch upload (20 messages per batch)
- Queue statistics and monitoring

### 4. Permission Management
- Centralized permission utility (PermissionUtils.kt)
- Runtime permission validation
- Auto-disable on permission revocation
- User-friendly permission alerts
- Required permissions:
  - READ_SMS
  - RECEIVE_SMS
  - POST_NOTIFICATIONS (Android 13+)

### 5. Reboot Safety
- BootReceiver restores service after reboot
- Permission validation before service start
- State persistence via SharedPreferences
- Graceful degradation if permissions missing

### 6. Foreground Service
- Persistent "SMS Sync Enabled" notification
- Keeps app in foreground priority
- Prevents system from killing the app
- Clean shutdown on toggle OFF

## Architecture

### Native Android Layer

```
┌─────────────────────────────────────────────────────────────┐
│                     Native Android Layer                     │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ SmsReceiver  │───▶│  Room DB     │───▶│ WorkManager  │  │
│  │(Broadcast)   │    │(Queue)       │    │(Upload)      │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                   │           │
│  ┌──────────────┐    ┌──────────────┐           │           │
│  │BootReceiver  │    │ Foreground   │           ▼           │
│  │(Reboot)      │───▶│ Service      │    ┌──────────────┐  │
│  └──────────────┘    │(Notification)│    │  SmsWorker   │  │
│                       └──────────────┘    │  (Upload)    │  │
│                                            └──────┬───────┘  │
│                                                   │           │
│                                                   ▼           │
│                                            ┌──────────────┐  │
│                                            │  Supabase    │  │
│                                            │     API      │  │
│                                            └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### React Native Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native Layer                        │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Dashboard   │    │   Messages   │    │   Settings   │  │
│  │   Screen     │    │    Screen    │    │    Screen    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                    │                    │           │
│         └────────────────────┴────────────────────┘          │
│                              │                                │
│                              ▼                                │
│                    ┌──────────────────┐                      │
│                    │ SmsSyncBridge    │                      │
│                    │ (Native Bridge)  │                      │
│                    └────────┬─────────┘                      │
│                             │                                 │
│                             ▼                                 │
│                    ┌──────────────────┐                      │
│                    │ SmsSyncModule.kt │                      │
│                    │ (Native Module)  │                      │
│                    └──────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Native Components

#### SmsSyncModule.kt
Main native module exposing methods to JavaScript:
- `enableSync()` - Enable SMS sync with permission validation
- `disableSync()` - Disable sync and stop services
- `importExistingSms(limit)` - Import SMS from device inbox
- `validatePermissionsAndAutoDisable()` - Runtime permission validation
- `checkRequiredPermissions()` - Check permission status
- `getQueue()` - Get all queued messages
- `getQueueStats()` - Get queue statistics
- `triggerUpload()` - Manually trigger upload

#### SmsReceiver.kt
BroadcastReceiver for incoming SMS:
- Listens to `SMS_RECEIVED_ACTION`
- Filters by sync enabled flag
- Filters by timestamp (only after sync enabled)
- Inserts to Room database
- Triggers WorkManager upload

#### SmsWorker.kt
WorkManager worker for background upload:
- Fetches pending messages from Room DB
- Batch processing (20 messages per batch)
- Uploads to Supabase REST API
- Updates message status
- Handles retries with exponential backoff
- Schedules next batch if more pending

#### SmsForegroundService.kt
Foreground service for app priority:
- Shows persistent notification
- Keeps app in foreground
- Prevents system from killing app
- Starts on sync enable
- Stops on sync disable

#### BootReceiver.kt
BroadcastReceiver for device reboot:
- Listens to `BOOT_COMPLETED` and `MY_PACKAGE_REPLACED`
- Checks sync enabled flag
- Validates permissions
- Restores foreground service if conditions met

#### PermissionUtils.kt
Centralized permission utility:
- Single source of truth for permission checks
- Checks READ_SMS, RECEIVE_SMS, POST_NOTIFICATIONS
- Used by all components

#### Room Database
- **SmsEntity.kt** - Message entity with status tracking
- **SmsDao.kt** - Data access object with queries
- **SmsDatabase.kt** - Database instance (singleton)

### JavaScript Components

#### SmsSyncBridge.ts
TypeScript interface to native module:
- Type-safe method signatures
- Promise-based API
- Used by all JS services

#### smsSyncManager.ts
High-level sync management:
- `startSmsSync()` - Enable sync with permission check
- `stopSmsSync()` - Disable sync
- `getSmsSyncState()` - Get current state
- `restoreSmsSyncIfNeeded()` - Restore on app start

#### queueManager.ts
Queue operations:
- `addToQueue()` - Add message to queue
- `getQueue()` - Get all messages
- `getQueueStats()` - Get statistics
- `clearQueue()` - Clear all messages
- `clearSentMessages()` - Clear sent messages

#### smsImporter.ts
Manual import:
- `importInbox(limit)` - Import existing SMS
- Calls native import method

#### appInitializer.ts
App initialization:
- Save API config to native
- Ensure service running
- Validate permissions and auto-disable
- Show alert if auto-disabled

## Data Flow

### Incoming SMS Flow
```
1. SMS Received
   ↓
2. SmsReceiver captures
   ↓
3. Check sync enabled
   ↓
4. Insert to Room DB (status: pending)
   ↓
5. Trigger WorkManager
   ↓
6. SmsWorker fetches batch
   ↓
7. Upload to Supabase
   ↓
8. Update status (sent/failed)
   ↓
9. Schedule next batch if more pending
```

### Manual Import Flow
```
1. User clicks "Import"
   ↓
2. JS calls SmsSyncBridge.importExistingSms()
   ↓
3. Native queries Telephony content provider
   ↓
4. Batch insert to Room DB
   ↓
5. Trigger WorkManager
   ↓
6. Upload batches
```

### Permission Revoke Flow
```
1. User revokes permission
   ↓
2. App starts
   ↓
3. appInitializer calls validatePermissionsAndAutoDisable()
   ↓
4. Detects: sync enabled BUT permissions missing
   ↓
5. Auto-disable sync
   ↓
6. Stop service
   ↓
7. Cancel WorkManager
   ↓
8. Show alert to user
```

## Setup Instructions

### Prerequisites
- Node.js >= 22.11.0
- Android SDK
- Android Studio
- React Native CLI

### Installation

1. **Clone and Install Dependencies**
```bash
npm install
cd android && ./gradlew clean && cd ..
```

2. **Configure Supabase**
Create `.env` file:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

3. **Build and Run**
```bash
npm run android
```

### Required Permissions

The app requires these permissions (requested at runtime):
- `READ_SMS` - Read SMS inbox for manual import
- `RECEIVE_SMS` - Capture incoming SMS
- `POST_NOTIFICATIONS` - Show foreground service notification (Android 13+)

## Usage

### Enable SMS Sync
1. Open app
2. Navigate to Dashboard
3. Toggle "SMS Sync Service" ON
4. Grant permissions if prompted
5. Notification appears: "SMS Sync Enabled"

### Manual Import
1. Ensure sync is enabled
2. Click "Import Device Inbox"
3. Wait for import to complete
4. Messages appear in queue
5. Automatic upload begins

### View Queue
1. Navigate to Messages screen
2. See all queued messages
3. View status (pending, syncing, sent, failed)
4. See retry count and errors

### Disable Sync
1. Navigate to Dashboard
2. Toggle "SMS Sync Service" OFF
3. Notification disappears
4. No more SMS captured

## Troubleshooting

### SMS Not Syncing
1. Check sync is enabled (Dashboard)
2. Verify permissions granted (Settings > Apps > SMS Sender > Permissions)
3. Check network connection
4. View logs: `adb logcat | grep SmsSyncModule`

### Service Not Starting After Reboot
1. Check permissions still granted
2. Check sync was enabled before reboot
3. View logs: `adb logcat | grep BootReceiver`

### Upload Failing
1. Check network connection
2. Verify Supabase URL and key in Settings
3. Check API endpoint is accessible
4. View logs: `adb logcat | grep SmsWorker`

## Development

### Project Structure
```
SmsSender/
├── android/                    # Android native code
│   └── app/src/main/java/com/smssender/
│       ├── MainActivity.kt
│       ├── MainApplication.kt
│       └── sms/
│           ├── BootReceiver.kt
│           ├── PermissionUtils.kt
│           ├── SmsDao.kt
│           ├── SmsDatabase.kt
│           ├── SmsEntity.kt
│           ├── SmsForegroundService.kt
│           ├── SmsReceiver.kt
│           ├── SmsSyncModule.kt
│           ├── SmsSyncPackage.kt
│           └── SmsWorker.kt
├── src/                        # React Native code
│   ├── config/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/
│   │   ├── dashboard/
│   │   ├── message/
│   │   ├── settings/
│   │   └── smsdetail/
│   └── services/
│       ├── api/
│       ├── app/
│       ├── native/
│       ├── queue/
│       ├── sms/
│       ├── smsSync/
│       ├── stats/
│       └── sync/
├── App.tsx
├── package.json
└── README.md
```

### Key Dependencies
```json
{
  "dependencies": {
    "react": "19.2.3",
    "react-native": "^0.84.0",
    "@react-navigation/native": "^7.1.28",
    "@react-navigation/native-stack": "^7.13.0",
    "@react-navigation/bottom-tabs": "^7.14.0",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "axios": "^1.13.5"
  }
}
```

### Android Dependencies
```gradle
// Room Database
implementation "androidx.room:room-runtime:2.6.1"
implementation "androidx.room:room-ktx:2.6.1"
ksp "androidx.room:room-compiler:2.6.1"

// WorkManager
implementation "androidx.work:work-runtime-ktx:2.9.0"
```

## Production Considerations

### Performance
- Batch processing reduces API calls
- Room database for efficient queries
- WorkManager respects system constraints
- Exponential backoff prevents API hammering

### Reliability
- Persistent queue survives app restarts
- WorkManager guarantees execution
- Automatic retry on failure
- Duplicate prevention via Room unique constraint

### Battery Efficiency
- WorkManager is battery-optimized
- No polling or loops
- Event-driven architecture
- Foreground service only when sync enabled

### Privacy & Security
- Permissions required before any SMS access
- User controls sync toggle
- Clear permission alerts
- No background data collection when disabled

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
