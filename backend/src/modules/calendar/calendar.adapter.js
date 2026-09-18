async function createEvent() {
  return { externalEventId: null, externalSyncStatus: "skipped" };
}

async function updateEvent() {
  return { externalSyncStatus: "skipped" };
}

async function deleteEvent() {
  return { externalSyncStatus: "skipped" };
}

module.exports = { createEvent, updateEvent, deleteEvent };
