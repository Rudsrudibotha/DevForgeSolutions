const DEFAULT_AAD_ADMIN_EMAILS = [
  'rudi@devforgesolutions.com',
  'tristan@devforgesolutions.com',
  'calvin@devforgesolutions.com',
  'rudsrudibotha@gmail.com',
  'ruds.botha.96@rudsbotha96gmail.onmicrosoft.com'
];

const DEFAULT_AAD_ADMIN_OBJECT_IDS = [
  '4eb30ac7-6453-429b-9380-ea2834f63e46'
];

const APPROVED_AAD_ADMIN_EMAILS = new Set(DEFAULT_AAD_ADMIN_EMAILS.map(normalizeEmail));
const APPROVED_AAD_ADMIN_OBJECT_IDS = new Set(DEFAULT_AAD_ADMIN_OBJECT_IDS.map(normalizeObjectId));

function normalizeAadGuestUpn(value) {
  const cleaned = String(value || '').trim().toLowerCase();
  const msaPrefixMatch = cleaned.match(/^(?:live\.com|outlook\.com|hotmail\.com)#(.+@.+)$/);

  if (msaPrefixMatch) {
    return msaPrefixMatch[1];
  }

  const extIndex = cleaned.indexOf('#ext#');

  if (extIndex === -1) {
    return cleaned;
  }

  const externalName = cleaned.slice(0, extIndex);
  const separator = externalName.lastIndexOf('_');

  if (separator <= 0 || separator === externalName.length - 1) {
    return cleaned;
  }

  return `${externalName.slice(0, separator)}@${externalName.slice(separator + 1)}`;
}

function normalizeEmail(email) {
  return normalizeAadGuestUpn(email);
}

function normalizeObjectId(value) {
  return String(value || '').trim().toLowerCase();
}

function parseEmailList(value) {
  return String(value || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
}

function parseObjectIdList(value) {
  return String(value || '')
    .split(',')
    .map(normalizeObjectId)
    .filter(Boolean);
}

function aadAdminEmails() {
  const configured = parseEmailList(process.env.AZURE_AD_ADMIN_EMAILS);
  const emails = configured.length
    ? configured.filter(email => APPROVED_AAD_ADMIN_EMAILS.has(email))
    : DEFAULT_AAD_ADMIN_EMAILS;

  return new Set(emails.map(normalizeEmail));
}

function aadAdminObjectIds() {
  const configured = parseObjectIdList(process.env.AZURE_AD_ADMIN_OBJECT_IDS);
  const objectIds = configured.length
    ? configured.filter(objectId => APPROVED_AAD_ADMIN_OBJECT_IDS.has(objectId))
    : DEFAULT_AAD_ADMIN_OBJECT_IDS;

  return new Set(objectIds.map(normalizeObjectId));
}

function isAadAdminEmailAllowed(email) {
  return aadAdminEmails().has(normalizeEmail(email));
}

function isAadAdminObjectIdAllowed(objectId) {
  return aadAdminObjectIds().has(normalizeObjectId(objectId));
}

module.exports = {
  DEFAULT_AAD_ADMIN_OBJECT_IDS,
  DEFAULT_AAD_ADMIN_EMAILS,
  isAadAdminEmailAllowed,
  isAadAdminObjectIdAllowed,
  normalizeEmail
};
