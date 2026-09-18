# Database

MongoDB via Mongoose. Soft delete uses `deletedAt` on User and Role. Token collections use TTL indexes.

## Collections

- User — email unique while not deleted; `roleIds`; status; lockout fields
- Role — unique slug while not deleted; `permissionIds`; `isSystem`; `isSuperAdmin`
- Permission — unique `name` (`module.action`)
- Session — unique `tokenHash`; TTL on `expiresAt`
- Notification — `userId` + read state
- AuditLog — immutable; actor snapshot
- PasswordResetToken / EmailVerificationToken — hashed token + TTL
- Settings — singleton `key=app`
- Lead — manufacturer company being sourced as an export supplier; `stage` (`new|contacted|qualified|converted|won|lost`); soft delete
- Contact — people at a manufacturer; `leadId`; `isPrimary`; soft delete
- Activity — notes, calls, follow-ups, appointments, meetings, tasks; required `leadId`; optional `contactId`; calendar sync stubs; soft delete
- FormDefinition — configurable form identity; `key` unique while not deleted; `currentDraftVersionId` / `currentPublishedVersionId`
- FormVersion — immutable once `published`; embeds sections, fields, rules, documents, and stages; `draft | published | archived`
- FormSubmission — values captured against a specific published `versionId`
- VerificationCase — staff-assigned supplier verification request against a published `supplier_verification` form; `assignedToId`; status `assigned|in_progress|submitted|verified|rejected|cancelled|expired`; stores questionnaire `values` / `derivedState`; submitted cases are locked until a reviewer approves (`POST /verification/:id/review`) or returns them; `reviews[]` case history; soft delete
- VerificationDocument — first-class evidence on a case; metadata (`title`, `description`, `issuer`, `documentNumber`, `issuedAt`, `expiresAt`); Cloudinary `files[]`; per-document status `pending_upload|submitted|verified|rejected|expired`; review timeline; unique `(caseId, documentKey)` while not deleted
- Lead also stores denormalized `verificationStatus` (`none|pending|verified|rejected|expired`) and `verificationSummary` counts

Use references for User↔Role↔Permission. Embed snapshots only on audit/notification payloads.
