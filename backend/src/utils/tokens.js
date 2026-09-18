const { hashToken, randomToken } = require("./hash");

function createOpaqueToken() {
  const raw = randomToken(32);
  return { raw, hash: hashToken(raw) };
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

module.exports = { createOpaqueToken, addHours, addMinutes };
