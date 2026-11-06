Here is a complete `README.md` you can share with your friend. It explains exactly what the script does, its features, and walks through the setup process step-by-step.

---

# Google Calendar Multi-Sync Automation

This Google Apps Script automatically syncs events from multiple source calendars (like a Work calendar and a Family calendar) into a single, unified destination calendar.

It is designed to be highly efficient, avoiding API rate limits and preventing duplicate events. All user settings are consolidated at the top of the script so you don't have to hunt through code to make changes.

## ✨ Features

* **One-Way Sync:** Copies events from source calendars to a destination calendar without altering the source events.
* **Smart Caching:** Pre-loads calendar data into memory to drastically reduce API calls and speed up execution.
* **Duplicate Prevention:** Uses both exact ID mapping and a "title + time" fallback to ensure events are never duplicated, even if sync tokens reset.
* **Custom Title Rules:** Automatically adds prefixes (e.g., "Work: [Event]") or replaces names (e.g., changing "Mom" to "Lisa").
* **Color Mapping:** Automatically applies specific Google Calendar color labels to synced events based on the source calendar or the original event's color.
* **Privacy Filters:** Can exclude specific events based on titles, keywords, or if you haven't accepted the invite.
* **Auto-Healing:** Includes built-in exponential backoff to handle Google's API rate limits gracefully.

---

## 🚀 How to Install and Set Up

### Step 1: Gather Your Calendar IDs

You will need the Google Calendar IDs for your destination calendar and any source calendars.

1. Open Google Calendar on a computer.
2. Hover over the calendar you want to use on the left sidebar, click the **three dots (⋮)**, and select **Settings and sharing**.
3. Scroll down to the **Integrate calendar** section.
4. Copy the **Calendar ID**.
* *Primary calendars are usually just your email address.*
* *Secondary calendars look like a long string ending in `@group.calendar.google.com`.*



### Step 2: Create the Apps Script Project

1. Go to [script.google.com](https://script.google.com/) and ensure you are logged into your primary Google account.
2. Click **New Project** in the top left.
3. Name your project (e.g., "Calendar Sync") by clicking "Untitled project" at the top.
4. Delete the empty `myFunction()` block and **paste the entire script** into the editor.

### Step 3: Enable the Google Calendar API

This script uses Google's Advanced Calendar Service to run at high speeds. **It will fail if you skip this step.**

1. On the left side of the Apps Script editor, look for **Services** and click the **+** (Add a service) button.
2. Scroll down and select **Google Calendar API**.
3. Click **Add**. (It will appear under the Services list as `Calendar`).

### Step 4: Configure Your Settings

At the very top of the script, find the **USER CONFIGURATION** block (Lines 7-34).
Update the variables to match your setup:

* Paste your `DEST_CAL_ID` (where everything will sync to).
* Update the `WORK_CAL_ID` and `FAMILY_CAL_ID`.
* Adjust your color mapping, title prefixes, and exclusion keywords as needed.
* *Do not edit anything below the "END OF USER CONFIGURATION" line.*

### Step 5: Save and Run

1. Click the **Save** icon (the floppy disk) in the toolbar.
2. In the dropdown menu at the top of the screen (next to the Debug/Run buttons), select **`setupAutomation`**.
3. Click **Run**.
4. Google will prompt you with a "Authorization Required" popup.
* Click **Review permissions**.
* Choose your Google account.
* *Note: Google may show a "Google hasn't verified this app" warning. This is normal for your own scripts. Click **Advanced**, then click **Go to [Project Name] (unsafe)**.*
* Click **Allow**.



**You're done!**
The script will now perform its first full sync. Going forward, it will run automatically in the background within seconds of any event being created, updated, or deleted on your source calendars.

---

## 🛠️ Maintenance & Troubleshooting

If you ever need to perform maintenance, you can select these functions from the dropdown in the Apps Script editor and click **Run**:

* **`forceResync`**: If your calendars ever get out of sync or you change your configuration rules, run this. It clears the script's memory and forces a fresh 30-day sync from scratch to apply your new rules.
* **`removeDuplicatesFast`**: If you ever end up with duplicates (perhaps from an old version of a script or manual mistakes), run this once. It scans the destination calendar, identifies duplicates by matching their titles and times, and removes the extras at maximum speed.

---