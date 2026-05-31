const DEFAULT_AAD_ADMIN_EMAILS = [
  'rudi@devforgesolutions.com',
  'tristan@devforgesolutions.com',
  'calvin@devforgesolutions.com',
  'ruds.botha@gmqail.com'
];

const APPROVED_AAD_ADMIN_EMAILS = new Set(DEFAULT_AAD_ADMIN_EMAILS.map(normalizeEmail));

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parseEmailList(value) {
  return String(value || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
}

function aadAdminEmails() {
  const configured = parseEmailList(process.env.AZURE_AD_ADMIN_EMAILS);
  const emails = configured.length
    ? configured.filter(email => APPROVED_AAD_ADMIN_EMAILS.has(email))
    : DEFAULT_AAD_ADMIN_EMAILS;

  return new Set(emails.map(normalizeEmail));
}

function isAadAdminEmailAllowed(email) {
  return aadAdminEmails().has(normalizeEmail(email));
}

module.exports = {
  DEFAULT_AAD_ADMIN_EMAILS,
  isAadAdminEmailAllowed,
  normalizeEmail
};
