import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, uuid, jsonb, inet } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// ============================================================================
// EXISTING TABLES (Keep as-is for backward compatibility)
// ============================================================================

// Main patient table (existing structure + CDC enhancements)
export const patient = pgTable('patient', {
  // Existing fields (DO NOT MODIFY)
  patientId: uuid('patient_id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  fullName: varchar('full_name', { length: 255 }),
  dob: timestamp('dob'),
  mrnEncrypted: text('mrn_encrypted'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  
  // CDC De-Duplication Fields (NEW)
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  middleName: varchar('middle_name', { length: 100 }),
  nameSuffix: varchar('name_suffix', { length: 20 }), // Mr, Mrs, Miss, Dr, etc.
  fullNameStandardized: varchar('full_name_standardized', { length: 255 }),
  phoneStandardized: varchar('phone_standardized', { length: 20 }),
  address: text('address'),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('India'),
  addressStandardized: text('address_standardized'),
  soundexLastName: varchar('soundex_last_name', { length: 10 }),
  blockingKey: varchar('blocking_key', { length: 100 }),
  
  // Entra External ID Integration (NEW)
  entraObjectId: varchar('entra_object_id', { length: 255 }).unique(),
  systemEmail: varchar('system_email', { length: 255 }), // Generated email if no real email
  emailVerifiedAt: timestamp('email_verified_at'),
  
  // Government ID Verification (NEW)
  govtIdVerified: boolean('govt_id_verified').default(false),
  trustLevel: varchar('trust_level', { length: 20 }).default('low'), // low, medium, high
  
  // Demographics (NEW)
  gender: varchar('gender', { length: 20 }),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  emergencyPhone: varchar('emergency_phone', { length: 20 }),
  
  // Insurance (NEW)
  insuranceProvider: varchar('insurance_provider', { length: 100 }),
  insuranceId: varchar('insurance_id', { length: 100 }),
  
  // Medical (NEW)
  medicalHistory: text('medical_history'),
  allergies: text('allergies'),
  
  // Security (NEW)
  recaptchaScore: decimal('recaptcha_score', { precision: 3, scale: 2 }),
});

// Existing auth_identity table (keep as-is)
export const authIdentity = pgTable('auth_identity', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  identityProvider: varchar('identity_provider', { length: 50 }).notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiry: timestamp('token_expiry'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Existing entra_otp_attempts table (keep as-is)
export const entraOtpAttempts = pgTable('entra_otp_attempts', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull(),
  otpHash: varchar('otp_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  attemptCount: integer('attempt_count').default(0),
  ipAddress: inet('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Existing otp_attempt table (keep as-is)
export const otpAttempt = pgTable('otp_attempt', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull(),
  otpHash: varchar('otp_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  attemptCount: integer('attempt_count').default(0),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Existing link_token table (keep as-is)
export const linkToken = pgTable('link_token', {
  id: serial('id').primaryKey(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  usedAt: timestamp('used_at'),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Existing audit_log table (keep as-is)
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id'),
  action: varchar('action', { length: 100 }).notNull(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  actorType: varchar('actor_type', { length: 50 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// ============================================================================
// NEW TABLES FOR HEALTHCARE & CDC COMPLIANCE
// ============================================================================

// Doctors table (NEW)
export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  specialization: varchar('specialization', { length: 100 }).notNull(),
  licenseNumber: varchar('license_number', { length: 50 }).notNull().unique(),
  yearsExperience: integer('years_experience'),
  education: text('education'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Appointments table (NEW)
export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id),
  appointmentDate: timestamp('appointment_date').notNull(),
  duration: integer('duration').default(30), // minutes
  status: varchar('status', { length: 50 }).notNull().default('scheduled'),
  reason: text('reason'),
  notes: text('notes'),
  confirmationSent: boolean('confirmation_sent').default(false),
  reminderSent: boolean('reminder_sent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Medical records table (NEW)
export const medicalRecords = pgTable('medical_records', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id),
  appointmentId: integer('appointment_id').references(() => appointments.id),
  recordDate: timestamp('record_date').notNull(),
  diagnosis: text('diagnosis'),
  treatment: text('treatment'),
  prescription: text('prescription'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Billing records table (NEW)
export const billingRecords = pgTable('billing_records', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  appointmentId: integer('appointment_id').references(() => appointments.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// CDC DE-DUPLICATION TABLES (NEW)
// ============================================================================

export const duplicateCandidates = pgTable('duplicate_candidates', {
  id: serial('id').primaryKey(),
  patientAId: uuid('patient_a_id').notNull().references(() => patient.patientId),
  patientBId: uuid('patient_b_id').notNull().references(() => patient.patientId),
  similarityScore: integer('similarity_score').notNull(),
  blockingKey: varchar('blocking_key', { length: 100 }),
  matchDetails: jsonb('match_details'),
  status: varchar('status', { length: 20 }).default('pending'),
  reviewedBy: varchar('reviewed_by', { length: 255 }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const duplicateAdjudication = pgTable('duplicate_adjudication', {
  id: serial('id').primaryKey(),
  patientAId: uuid('patient_a_id').notNull().references(() => patient.patientId, { onDelete: 'cascade' }),
  patientBId: uuid('patient_b_id').notNull().references(() => patient.patientId, { onDelete: 'cascade' }),
  decision: varchar('decision', { length: 20 }).notNull(),
  adjudicatedBy: varchar('adjudicated_by', { length: 255 }).notNull(),
  adjudicatedAt: timestamp('adjudicated_at').defaultNow(),
  notes: text('notes'),
});

export const patientMergeAudit = pgTable('patient_merge_audit', {
  id: serial('id').primaryKey(),
  sourcePatientId: uuid('source_patient_id').notNull().references(() => patient.patientId, { onDelete: 'restrict' }),
  targetPatientId: uuid('target_patient_id').notNull().references(() => patient.patientId, { onDelete: 'restrict' }),
  mergedBy: varchar('merged_by', { length: 255 }).notNull(),
  mergedAt: timestamp('merged_at').defaultNow(),
  mergeData: jsonb('merge_data'),
  canUnmerge: boolean('can_unmerge').default(true),
});

// ============================================================================
// GOVERNMENT ID VERIFICATION (NEW)
// ============================================================================

export const patientIdentityDocuments = pgTable('patient_identity_documents', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  documentNumberEncrypted: text('document_number_encrypted'),
  documentNumberLast4: varchar('document_number_last4', { length: 4 }),
  documentFileUrl: text('document_file_url'),
  verifiedAt: timestamp('verified_at'),
  verifiedVia: varchar('verified_via', { length: 50 }),
  verifiedBy: varchar('verified_by', { length: 255 }),
  verificationStatus: varchar('verification_status', { length: 20 }).default('pending'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// SESSION MANAGEMENT & SECURITY (NEW)
// ============================================================================

export const patientSessions = pgTable('patient_sessions', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
  deviceInfo: jsonb('device_info'),
  ipAddress: inet('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  isActive: boolean('is_active').default(true),
});

// Patient PIN for second-factor verification (NEW)
export const patientPin = pgTable('patient_pin', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().unique().references(() => patient.patientId),
  pinHash: varchar('pin_hash', { length: 255 }).notNull(),
  salt: varchar('salt', { length: 255 }).notNull(),
  failedAttempts: integer('failed_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// HIPAA AUDIT LOGGING (Enhanced version of existing audit_log) (NEW)
// ============================================================================

export const hipaaAuditLog = pgTable('hipaa_audit_log', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id'),
  action: varchar('action', { length: 100 }).notNull(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  actorType: varchar('actor_type', { length: 50 }).notNull(),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  accessedData: jsonb('accessed_data'),
  timestamp: timestamp('timestamp').defaultNow(),
  hipaaComplianceNote: text('hipaa_compliance_note'),
});

// ============================================================================
// CONSENT MANAGEMENT (NEW)
// ============================================================================

export const patientConsents = pgTable('patient_consents', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  consentType: varchar('consent_type', { length: 100 }).notNull(),
  granted: boolean('granted').notNull(),
  grantedAt: timestamp('granted_at'),
  revokedAt: timestamp('revoked_at'),
  consentDocumentUrl: text('consent_document_url'),
  ipAddress: inet('ip_address'),
  signatureData: text('signature_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// FAMILY / EMERGENCY ACCESS (NEW)
// ============================================================================

export const familyAccess = pgTable('family_access', {
  id: serial('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patient.patientId),
  guardianPatientId: uuid('guardian_patient_id').notNull().references(() => patient.patientId),
  relationship: varchar('relationship', { length: 50 }).notNull(),
  accessLevel: varchar('access_level', { length: 20 }).notNull(),
  approvedAt: timestamp('approved_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  consentDocumentUrl: text('consent_document_url'),
  isActive: boolean('is_active').default(true),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const patientRelations = relations(patient, ({ many }) => ({
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  billingRecords: many(billingRecords),
  identityDocuments: many(patientIdentityDocuments),
  sessions: many(patientSessions),
  consents: many(patientConsents),
  familyAccessAsPatient: many(familyAccess, { relationName: 'patient' }),
  familyAccessAsGuardian: many(familyAccess, { relationName: 'guardian' }),
  duplicateCandidatesA: many(duplicateCandidates, { relationName: 'patientA' }),
  duplicateCandidatesB: many(duplicateCandidates, { relationName: 'patientB' }),
  authIdentities: many(authIdentity),
}));

export const doctorsRelations = relations(doctors, ({ many }) => ({
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patient, { fields: [appointments.patientId], references: [patient.patientId] }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  medicalRecords: many(medicalRecords),
  billingRecords: many(billingRecords),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patient, { fields: [medicalRecords.patientId], references: [patient.patientId] }),
  doctor: one(doctors, { fields: [medicalRecords.doctorId], references: [doctors.id] }),
  appointment: one(appointments, { fields: [medicalRecords.appointmentId], references: [appointments.id] }),
}));

export const billingRecordsRelations = relations(billingRecords, ({ one }) => ({
  patient: one(patient, { fields: [billingRecords.patientId], references: [patient.patientId] }),
  appointment: one(appointments, { fields: [billingRecords.appointmentId], references: [appointments.id] }),
}));

export const duplicateCandidatesRelations = relations(duplicateCandidates, ({ one }) => ({
  patientA: one(patient, { fields: [duplicateCandidates.patientAId], references: [patient.patientId], relationName: 'patientA' }),
  patientB: one(patient, { fields: [duplicateCandidates.patientBId], references: [patient.patientId], relationName: 'patientB' }),
}));

export const patientIdentityDocumentsRelations = relations(patientIdentityDocuments, ({ one }) => ({
  patient: one(patient, { fields: [patientIdentityDocuments.patientId], references: [patient.patientId] }),
}));

export const patientSessionsRelations = relations(patientSessions, ({ one }) => ({
  patient: one(patient, { fields: [patientSessions.patientId], references: [patient.patientId] }),
}));

export const patientConsentsRelations = relations(patientConsents, ({ one }) => ({
  patient: one(patient, { fields: [patientConsents.patientId], references: [patient.patientId] }),
}));

export const familyAccessRelations = relations(familyAccess, ({ one }) => ({
  patient: one(patient, { fields: [familyAccess.patientId], references: [patient.patientId], relationName: 'patient' }),
  guardian: one(patient, { fields: [familyAccess.guardianPatientId], references: [patient.patientId], relationName: 'guardian' }),
}));

export const authIdentityRelations = relations(authIdentity, ({ one }) => ({
  patient: one(patient, { fields: [authIdentity.patientId], references: [patient.patientId] }),
}));

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type Patient = typeof patient.$inferSelect;
export type InsertPatient = typeof patient.$inferInsert;
export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;
export type BillingRecord = typeof billingRecords.$inferSelect;
export type InsertBillingRecord = typeof billingRecords.$inferInsert;
export type DuplicateCandidate = typeof duplicateCandidates.$inferSelect;
export type InsertDuplicateCandidate = typeof duplicateCandidates.$inferInsert;
export type DuplicateAdjudication = typeof duplicateAdjudication.$inferSelect;
export type InsertDuplicateAdjudication = typeof duplicateAdjudication.$inferInsert;
export type PatientMergeAudit = typeof patientMergeAudit.$inferSelect;
export type InsertPatientMergeAudit = typeof patientMergeAudit.$inferInsert;
export type PatientIdentityDocument = typeof patientIdentityDocuments.$inferSelect;
export type InsertPatientIdentityDocument = typeof patientIdentityDocuments.$inferInsert;
export type PatientSession = typeof patientSessions.$inferSelect;
export type InsertPatientSession = typeof patientSessions.$inferInsert;
export type HipaaAuditLog = typeof hipaaAuditLog.$inferSelect;
export type InsertHipaaAuditLog = typeof hipaaAuditLog.$inferInsert;
export type PatientConsent = typeof patientConsents.$inferSelect;
export type InsertPatientConsent = typeof patientConsents.$inferInsert;
export type FamilyAccess = typeof familyAccess.$inferSelect;
export type InsertFamilyAccess = typeof familyAccess.$inferInsert;
export type AuthIdentity = typeof authIdentity.$inferSelect;
export type InsertAuthIdentity = typeof authIdentity.$inferInsert;
export type EntraOtpAttempt = typeof entraOtpAttempts.$inferSelect;
export type InsertEntraOtpAttempt = typeof entraOtpAttempts.$inferInsert;
export type OtpAttempt = typeof otpAttempt.$inferSelect;
export type InsertOtpAttempt = typeof otpAttempt.$inferInsert;
export type LinkToken = typeof linkToken.$inferSelect;
export type InsertLinkToken = typeof linkToken.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
