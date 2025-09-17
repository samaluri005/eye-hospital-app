// Shared types for Eye Hospital Management System

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  time: string;
  type: 'consultation' | 'surgery' | 'follow-up' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  email: string;
  phone: string;
  isAvailable: boolean;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin' | 'staff';
  firstName: string;
  lastName: string;
  isActive: boolean;
}