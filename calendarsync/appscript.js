/**
 * GOOGLE CALENDAR SYNC AUTOMATION
 * Syncs multiple source calendars into a single destination calendar.
 * Includes rate-limit protection, duplicate prevention, and caching for speed.
 */

// ==========================================
// ⚙️ USER CONFIGURATION - EDIT THIS SECTION ONLY
// ==========================================
const DEST_CAL_ID = 'YOUR_DESTINATION_CALENDAR_ID@group.calendar.google.com';
const SYNC_DAYS_AHEAD = 30; 

// --- 1. WORK CALENDAR SETTINGS ---
const WORK_CAL_ID = 'WORK_EMAIL_HERE@company.com';
const WORK_COLOR_ID = '10'; // '10' is Basil
const WORK_TITLE_PREFIX = 'Work: ';
const WORK_EXCLUDE_STARTS_WITH = ['block', 'recover', 'drive', 'driving'];
const WORK_EXCLUDE_CONTAINS = [];
const WORK_EXCLUDE_EXACT = [];

// --- 2. FAMILY CALENDAR SETTINGS ---
const FAMILY_CAL_ID = 'FAMILY_CALENDAR_ID@group.calendar.google.com';
const FAMILY_NAME_REPLACEMENTS = {
  'mom': 'Lisa',
  'dad': 'Tim'
};
const FAMILY_COLOR_MAP = {
  '3': 'Phoebe',    
  '7': 'Isabelle',  
  '2': 'Clara',     
  '10': 'Tim',      
  '5': 'Lisa' 
};
const FAMILY_EXCLUDE_STARTS_WITH = ['nyla'];
const FAMILY_EXCLUDE_CONTAINS = ['cleaners'];
const FAMILY_EXCLUDE_EXACT = [];
// ==========================================
// 🛑 END OF USER CONFIGURATION 
// ==========================================


// Global cache to drastically speed up event lookups and prevent API quota limits
let destEventCache = null; 

// ==========================================
// CALENDAR SYSTEM SETUP (No need to edit below)
// ==========================================
const CALENDAR_CONFIGS = {};

// Build Work Calendar Config
CALENDAR_CONFIGS[WORK_CAL_ID] = {
  requireAccepted: true,
  forceColorId: WORK_COLOR_ID,
  excludeStartsWith: WORK_EXCLUDE_STARTS_WITH,
  excludeTitleIs: WORK_EXCLUDE_EXACT, 
  excludeContains: WORK_EXCLUDE_CONTAINS, 
  shouldExclude: function(title) {
    if (!title) return false;
    const lowerTitle = title.trim().toLowerCase();
    if (this.excludeTitleIs.some(t => lowerTitle === t.toLowerCase())) return true;
    if (this.excludeStartsWith.some(t => lowerTitle.startsWith(t.toLowerCase()))) return true;
    if (this.excludeContains.some(t => lowerTitle.includes(t.toLowerCase()))) return true;
    return false;
  },
  transformTitle: function(title, event) {
    const cleanPrefix = WORK_TITLE_PREFIX.trim().toLowerCase();
    if (!title.toLowerCase().startsWith(cleanPrefix)) {
      return `${WORK_TITLE_PREFIX}${title}`;
    }
    return title; 
  }
};

// Build Family Calendar Config
CALENDAR_CONFIGS[FAMILY_CAL_ID] = {
  requireAccepted: false, 
  forceColorId: null, 
  excludeStartsWith: FAMILY_EXCLUDE_STARTS_WITH,
  excludeTitleIs: FAMILY_EXCLUDE_EXACT,
  excludeContains: FAMILY_EXCLUDE_CONTAINS,
  shouldExclude: function(title) {
    if (!title) return false;
    const lowerTitle = title.trim().toLowerCase();
    if (this.excludeTitleIs.some(t => lowerTitle === t.toLowerCase())) return true;
    if (this.excludeStartsWith.some(t => lowerTitle.startsWith(t.toLowerCase()))) return true;
    if (this.excludeContains.some(t => lowerTitle.includes(t.toLowerCase()))) return true;
    return false;
  },
  transformTitle: function(title, event) {
    let newTitle = title;
    
    // Dynamically apply name replacements (e.g. mom -> Partner1)
    for (const [oldName, newName] of Object.entries(FAMILY_NAME_REPLACEMENTS)) {
      const regex = new RegExp(`\\b${oldName}\\b`, 'gi');
      newTitle = newTitle.replace(regex, newName);
    }
    
    // Apply color map prefix if event has a mapped color
    if (event.colorId && FAMILY_COLOR_MAP[event.colorId]) {
      const name = FAMILY_COLOR_MAP[event.colorId];
      if (!newTitle.toLowerCase().includes(name.toLowerCase())) {
        newTitle = `${name}: ${newTitle}`;
      }
    }
    return newTitle;
  }
};

// ==========================================
// HELPER: EXPONENTIAL BACKOFF
// ==========================================
function apiWithRetry(action) {
  for (let i = 0; i < 6; i++) {
    try {
      return action();
    } catch (e) {
      if (e.message.includes('Quota') || e.message.includes('Rate Limit') || e.message.includes('Backend Error')) {
        Utilities.sleep((Math.pow(2, i) * 1000) + Math.round(Math.random() * 1000));
      } else {
        throw e; 
      }
    }
  }
  throw new Error("Max API retries exceeded due to rate limiting.");
}

// ==========================================
// CORE SYNC LOGIC
// ==========================================
function performSync(e) {
  const properties = PropertiesService.getUserProperties();
  let calendarsToSync = Object.keys(CALENDAR_CONFIGS);
  
  if (e && e.calendarId && CALENDAR_CONFIGS[e.calendarId]) {
    calendarsToSync = [e.calendarId];
  }

  buildDestinationCache();

  calendarsToSync.forEach(calId => {
    syncCalendar(calId, properties);
  });
}

function syncCalendar(calendarId, properties) {
  const tokenKey = 'syncToken_' + calendarId;
  let syncToken = properties.getProperty(tokenKey);
  let options = { maxResults: 500 }; 

  if (syncToken) {
    options.syncToken = syncToken;
  } else {
    const now = new Date();
    options.timeMin = now.toISOString();
    const future = new Date();
    future.setDate(now.getDate() + SYNC_DAYS_AHEAD);
    options.timeMax = future.toISOString();
  }

  let pageToken;
  do {
    options.pageToken = pageToken;
    let events;
    try {
      events = apiWithRetry(() => Calendar.Events.list(calendarId, options));
    } catch (e) {
      if (e.message.includes('Sync token is no longer valid') || e.message.includes('Invalid sync token')) {
        properties.deleteProperty(tokenKey);
        syncCalendar(calendarId, properties); 
        return;
      } else {
        throw e;
      }
    }

    if (events.items && events.items.length > 0) {
      events.items.forEach(event => {
        processEvent(event, calendarId);
      });
    }

    pageToken = events.nextPageToken;
    if (events.nextSyncToken) {
      properties.setProperty(tokenKey, events.nextSyncToken);
    }
  } while (pageToken);
}

function processEvent(event, calendarId) {
  const config = CALENDAR_CONFIGS[calendarId];
  if (!config) return;

  if (event.status === 'cancelled' || event.eventType === 'workingLocation') {
    deleteDestinationEvent(event.id);
    return;
  }

  const originalTitle = event.summary || '';

  if (config.shouldExclude(originalTitle)) {
    deleteDestinationEvent(event.id); 
    return;
  }

  if (config.requireAccepted) {
    let isAccepted = false;
    if (event.organizer && event.organizer.email === calendarId) {
       isAccepted = true; 
    }
    if (event.attendees) {
      for (let i = 0; i < event.attendees.length; i++) {
        if (event.attendees[i].email === calendarId) {
          if (event.attendees[i].responseStatus === 'accepted') isAccepted = true;
          break;
        }
      }
    }
    if (!isAccepted) {
      deleteDestinationEvent(event.id); 
      return;
    }
  }

  event.transformedTitle = config.transformTitle(originalTitle, event);
  syncToDestination(event, config);
}

function syncToDestination(sourceEvent, config) {
  const destEventId = getDestinationEventId(sourceEvent);
  const sourceLink = sourceEvent.htmlLink ? `\n\nOriginal Event Link: ${sourceEvent.htmlLink}` : '';
  
  const newEvent = {
    summary: sourceEvent.transformedTitle,
    start: sourceEvent.start,
    end: sourceEvent.end,
    description: sourceLink,
    extendedProperties: {
      private: { sourceId: sourceEvent.id }
    }
  };

  if (config.forceColorId) {
    newEvent.colorId = config.forceColorId; 
  } else if (sourceEvent.colorId) {
    newEvent.colorId = sourceEvent.colorId;
  }

  if (sourceEvent.recurrence) newEvent.recurrence = sourceEvent.recurrence;
  
  if (sourceEvent.recurringEventId) {
    const destMasterId = getDestinationEventId({id: sourceEvent.recurringEventId});
    if (destMasterId) newEvent.recurringEventId = destMasterId;
  }

  try {
    if (destEventId) {
      apiWithRetry(() => Calendar.Events.update(newEvent, DEST_CAL_ID, destEventId));
    } else {
      const inserted = apiWithRetry(() => Calendar.Events.insert(newEvent, DEST_CAL_ID));
      if (inserted) destEventCache[sourceEvent.id] = inserted.id; 
    }
  } catch (e) {
    Logger.log("Error syncing event: " + e.message);
  }
}

// ==========================================
// CACHING & DUPLICATE PREVENTION 
// ==========================================
function buildDestinationCache() {
  destEventCache = {};
  const now = new Date();
  const timeMin = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString(); 
  const timeMax = new Date(now.getTime() + ((SYNC_DAYS_AHEAD + 5) * 24 * 60 * 60 * 1000)).toISOString();
  
  let pageToken;
  do {
    const response = apiWithRetry(() => Calendar.Events.list(DEST_CAL_ID, {
      timeMin: timeMin,
      timeMax: timeMax,
      maxResults: 2500,
      pageToken: pageToken
    }));
    
    if (response.items) {
       response.items.forEach(evt => {
         if (evt.extendedProperties && evt.extendedProperties.private && evt.extendedProperties.private.sourceId) {
           destEventCache[evt.extendedProperties.private.sourceId] = evt.id;
         }
         if (evt.start && evt.end) {
           const start = evt.start.dateTime || evt.start.date;
           const end = evt.end.dateTime || evt.end.date;
           const signature = `${evt.summary}_${start}_${end}`;
           destEventCache[signature] = evt.id;
         }
       });
    }
    pageToken = response.nextPageToken;
  } while (pageToken);
}

function getDestinationEventId(sourceEvent) {
  if (!destEventCache) buildDestinationCache(); 

  const sourceEventId = sourceEvent.id;

  if (destEventCache[sourceEventId]) return destEventCache[sourceEventId];
  
  if (sourceEvent.transformedTitle && sourceEvent.start && sourceEvent.end) {
    const startIso = sourceEvent.start.dateTime || sourceEvent.start.date;
    const endIso = sourceEvent.end.dateTime || sourceEvent.end.date;
    const signature = `${sourceEvent.transformedTitle}_${startIso}_${endIso}`;
    
    if (destEventCache[signature]) {
      const matchId = destEventCache[signature];
      try {
        apiWithRetry(() => Calendar.Events.patch({
          extendedProperties: { private: { sourceId: sourceEventId } }
        }, DEST_CAL_ID, matchId));
      } catch(e) {}
      
      destEventCache[sourceEventId] = matchId; 
      return matchId;
    }
  }

  if (sourceEventId.includes('_')) {
    const parts = sourceEventId.split('_');
    const masterSourceId = parts[0];
    const timestamp = parts.slice(1).join('_'); 
    
    const destMasterId = destEventCache[masterSourceId];
    if (destMasterId) {
      const expectedDestInstanceId = `${destMasterId}_${timestamp}`;
      try {
         const instance = apiWithRetry(() => Calendar.Events.get(DEST_CAL_ID, expectedDestInstanceId));
         if (instance) return instance.id;
      } catch(e) {}
    }
  }
  
  return null;
}

function deleteDestinationEvent(sourceEventId) {
  const destEventId = getDestinationEventId({id: sourceEventId});
  if (destEventId) {
    try {
      apiWithRetry(() => Calendar.Events.remove(DEST_CAL_ID, destEventId));
    } catch (e) {}
  }
}

// ==========================================
// UTILITIES (Setup & Cleanup)
// ==========================================
function setupAutomation() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  Object.keys(CALENDAR_CONFIGS).forEach(calId => {
    ScriptApp.newTrigger('performSync')
      .forUserCalendar(calId)
      .onEventUpdated()
      .create();
  });
    
  Logger.log("Triggers created. Running initial sync...");
  performSync();
}

function forceResync() {
  PropertiesService.getUserProperties().deleteAllProperties(); 
  Logger.log("Sync tokens cleared. Running fresh sync...");
  performSync();
}

function removeDuplicatesFast() {
  let pageToken;
  let allEvents = [];
  
  do {
    let response = apiWithRetry(() => Calendar.Events.list(DEST_CAL_ID, {
      maxResults: 500,
      singleEvents: true,
      pageToken: pageToken
    }));
    if (response.items) allEvents = allEvents.concat(response.items);
    pageToken = response.nextPageToken;
  } while (pageToken);

  let seen = {};
  let duplicatesToDelete = [];

  allEvents.forEach(event => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    const signature = `${event.summary}_${start}_${end}`;

    if (seen[signature]) {
      duplicatesToDelete.push(event.id);
    } else {
      seen[signature] = true;
    }
  });

  Logger.log(`Found ${duplicatesToDelete.length} duplicates. Starting deletion...`);
  
  let deletedCount = 0;
  duplicatesToDelete.forEach(id => {
    try {
      apiWithRetry(() => Calendar.Events.remove(DEST_CAL_ID, id));
      deletedCount++;
    } catch (e) {
      Logger.log(`Failed to delete one event: ${e.message}`);
    }
  });

  Logger.log(`Cleanup complete. Removed ${deletedCount} duplicate events.`);
}

function removeDuplicatesMemorySafe() {
  let pageToken;
  let seen = {};
  let duplicatesToDelete = [];
  
  Logger.log("Scanning for duplicates (memory-safe mode)...");

  // 1. Process page by page so we don't hold heavy objects in memory
  do {
    let response = apiWithRetry(() => Calendar.Events.list(DEST_CAL_ID, {
      maxResults: 2500, // Fetch max allowed per page
      singleEvents: true,
      pageToken: pageToken
    }));
    
    if (response.items) {
      response.items.forEach(event => {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        const summary = event.summary || '';
        const signature = `${summary}_${start}_${end}`;

        if (seen[signature]) {
          // It's a duplicate! Just save the ID string (takes almost zero memory)
          duplicatesToDelete.push(event.id);
        } else {
          seen[signature] = true;
        }
      });
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  Logger.log(`Found ${duplicatesToDelete.length} duplicates. Starting deletion...`);
  
  // 2. Delete with a time limit check
  const startTime = Date.now();
  let deletedCount = 0;
  
  for (let i = 0; i < duplicatesToDelete.length; i++) {
    // Check if we've been running for 5 minutes (300,000 ms)
    // Apps Script hard-crashes at 6 minutes. This stops it gracefully so it doesn't fail.
    if (Date.now() - startTime > 300000) { 
      Logger.log(`⚠️ Approaching Google's 6-minute execution limit. Paused after deleting ${deletedCount} events.`);
      Logger.log(`➡️ PLEASE CLICK "RUN" AGAIN TO CONTINUE DELETING THE REMAINING ${duplicatesToDelete.length - deletedCount} DUPLICATES.`);
      return; // Exit the function early
    }
    
    try {
      apiWithRetry(() => Calendar.Events.remove(DEST_CAL_ID, duplicatesToDelete[i]));
      deletedCount++;
    } catch (e) {
      Logger.log(`Failed to delete event: ${e.message}`);
    }
  }

  Logger.log(`✅ Cleanup 100% complete! Removed ${deletedCount} duplicate events.`);
}