import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (patients, doctors, staff)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 50 }).notNull().default('patient'), // patient, doctor, admin, staff
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Patients table (extends users for patient-specific info)
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  dateOfBirth: timestamp('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  address: text('address'),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  emergencyPhone: varchar('emergency_phone', { length: 20 }),
  insuranceProvider: varchar('insurance_provider', { length: 100 }),
  insuranceId: varchar('insurance_id', { length: 100 }),
  medicalHistory: text('medical_history'),
  allergies: text('allergies'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Doctors table
export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  specialization: varchar('specialization', { length: 100 }).notNull(),
  licenseNumber: varchar('license_number', { length: 50 }).notNull().unique(),
  yearsExperience: integer('years_experience'),
  education: text('education'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Appointments table
export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id),
  appointmentDate: timestamp('appointment_date').notNull(),
  duration: integer('duration').default(30), // minutes
  status: varchar('status', { length: 50 }).notNull().default('scheduled'), // scheduled, confirmed, cancelled, completed, no_show
  reason: text('reason'),
  notes: text('notes'),
  confirmationSent: boolean('confirmation_sent').default(false),
  reminderSent: boolean('reminder_sent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Medical records table
export const medicalRecords = pgTable('medical_records', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id),
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

// Billing records table
export const billingRecords = pgTable('billing_records', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  appointmentId: integer('appointment_id').references(() => appointments.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, paid, failed, refunded
  paymentMethod: varchar('payment_method', { length: 50 }),
  stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// SMS/Webhook logs table
export const webhookLogs = pgTable('webhook_logs', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(), // sms, billing, appointment, insurance
  source: varchar('source', { length: 100 }), // twilio, stripe, etc.
  payload: text('payload'),
  status: varchar('status', { length: 50 }).notNull().default('received'), // received, processed, failed
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients),
  doctor: one(doctors),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  billingRecords: many(billingRecords),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  medicalRecords: many(medicalRecords),
  billingRecords: many(billingRecords),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, { fields: [medicalRecords.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [medicalRecords.doctorId], references: [doctors.id] }),
  appointment: one(appointments, { fields: [medicalRecords.appointmentId], references: [appointments.id] }),
}));

export const billingRecordsRelations = relations(billingRecords, ({ one }) => ({
  patient: one(patients, { fields: [billingRecords.patientId], references: [patients.id] }),
  appointment: one(appointments, { fields: [billingRecords.appointmentId], references: [appointments.id] }),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ }) => ({}));

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;
export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;
export type BillingRecord = typeof billingRecords.$inferSelect;
export type InsertBillingRecord = typeof billingRecords.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;