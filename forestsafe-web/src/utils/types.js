/**
 * @typedef {'fire'|'dumping'|'other'} ReportType
 * @typedef {'low'|'medium'|'high'} ReportUrgency
 * @typedef {'pending'|'sent'|'resolved'|'failed'} ReportStatus
 *
 * @typedef {Object} Report
 * @property {string} id
 * @property {ReportType} type
 * @property {ReportUrgency} urgency
 * @property {string} description
 * @property {number} lat
 * @property {number} lng
 * @property {string} [photoUrl]
 * @property {ReportStatus} status
 * @property {string} createdAt           ISO 8601 timestamp
 * @property {string} [userName]
 */

export {};
