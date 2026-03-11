# SmsSender

SmsSender is a React Native Android application that captures incoming SMS messages and synchronizes them with a backend API in real time. The app runs a background service that listens for SMS events even when the application is closed.

---

## Project Overview

SmsSender is designed to automatically collect SMS messages from an Android device and send them to a backend server.

The application runs a persistent background service that listens for new SMS messages and uploads them to a remote API while also displaying logs and statistics in the user interface.

### Use Cases
- Automation workflows triggered by SMS
- Message logging

---

## Features

- Background SMS listening
- Works even when the app is closed
- Permission management for SMS and notifications
- Local queue storage for pending messages
- Automatic batch sync with backend API
- Retry mechanism for failed uploads
- Foreground service support for reliability
- Dashboard UI for sync status and message logs

---

## Tech Stack

### Mobile Application
- React Native (v0.84)
- TypeScript
- React Navigation (Bottom Tabs + Stack Navigation)
- Async Storage

### Native Android
- Kotlin
- Android BroadcastReceiver
- Foreground Service
- WorkManager
- Room Database (SQLite ORM)

### Backend Integration
- Supabase REST API

---

## Architecture

The application combines React Native UI with native Android modules to ensure reliable background execution.

React Native UI -> Native Bridge (SmsSyncModule) -> SMS BroadcastReceiver -> Room Database Queue -> WorkManager Background Worker -> Supabase REST API



### Main Components

**SMS Receiver**
- Captures incoming SMS messages using Android BroadcastReceiver.

**Local Database**
- Stores messages locally using Room database before uploading.

**Background Worker**
- Uses WorkManager to upload queued messages to the backend.

**Foreground Service**
- Keeps the background process alive when SMS sync is enabled.

**React Native UI**
- Displays sync status, queue statistics, and message logs.

---

## Permissions Used

 READ_SMS -  Read SMS messages from the device
 RECEIVE_SMS -  Listen for incoming SMS
 POST_NOTIFICATIONS -  Show foreground service notification
 INTERNET -  Send SMS data to backend API
 ACCESS_NETWORK_STATE -  Check network connectivity
 FOREGROUND_SERVICE -  Run persistent background service

---

## How It Works

1. User enables SMS Sync using a toggle in the dashboard.
2. The app requests required permissions (SMS and notifications).
3. A foreground service is started to keep the sync active.
4. When an SMS arrives, the BroadcastReceiver captures it.
5. The message is stored in the local Room database queue.
6. A background worker uploads queued messages to the API.
7. Successful messages are marked as sent; failures retry automatically.

---

## Setup & Installation

### Prerequisites

- Node.js >= 22
- Android SDK
- Java JDK 17
- Android Studio

### Install Dependencies

```bash
npm install
