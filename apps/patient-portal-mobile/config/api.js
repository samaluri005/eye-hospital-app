// Mobile app API configuration
const API_CONFIG = {
  // Development: Use ngrok URL when testing locally
  development: {
    baseURL: 'https://abc123.ngrok-free.app', // Replace with your ngrok URL
    timeout: 10000,
  },
  
  // Production: Use your deployed Replit URL
  production: {
    baseURL: 'https://your-repl-name.your-username.repl.co',
    timeout: 10000,
  }
};

const currentEnv = __DEV__ ? 'development' : 'production';

export const API_BASE_URL = API_CONFIG[currentEnv].baseURL;
export const API_TIMEOUT = API_CONFIG[currentEnv].timeout;

// Example API endpoints for mobile app
export const ENDPOINTS = {
  // Patient endpoints
  GET_APPOINTMENTS: '/api/appointments',
  BOOK_APPOINTMENT: '/api/appointments/book',
  CANCEL_APPOINTMENT: '/api/appointments/cancel',
  
  // Patient data
  GET_PROFILE: '/api/patient/profile',
  UPDATE_PROFILE: '/api/patient/profile',
  GET_MEDICAL_RECORDS: '/api/patient/records',
  
  // Notifications
  REGISTER_PUSH_TOKEN: '/api/notifications/register',
  GET_NOTIFICATIONS: '/api/notifications',
  
  // Billing
  GET_BILLS: '/api/billing',
  PAY_BILL: '/api/billing/pay'
};

console.log('🏥 Mobile API configured for:', currentEnv);
console.log('📱 Base URL:', API_BASE_URL);