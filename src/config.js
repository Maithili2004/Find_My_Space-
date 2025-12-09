// Production backend URL
// Update this with your Render backend URL after deployment
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  CREATE_ORDER: `${BACKEND_URL}/createOrder`,
  CREATE_PAYMENT: `${BACKEND_URL}/api/payments/create`,
  PAYMENT_WEBHOOK: `${BACKEND_URL}/payment/webhook`,
  MARK_PARKED: `${BACKEND_URL}/api/bookings/mark-parked`,
  RELEASE_PAYOUT: `${BACKEND_URL}/releasePayout`,
};
