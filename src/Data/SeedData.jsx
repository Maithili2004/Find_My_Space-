const EVENTS_KEY = "fms_events";
const PARKING_KEY = "fms_parking";
const BOOKINGS_KEY = "fms_bookings";
const PROVIDER_SPOTS_KEY = "fms_provider_spots";
const NOTIFICATIONS_KEY = "fms_notifications";

// Events are now managed in Firestore, not localStorage
const sampleParking = [];

export function seedIfNeeded() {
  if (!localStorage.getItem(EVENTS_KEY)) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(sampleEvents));
  }
  if (!localStorage.getItem(PARKING_KEY)) {
    localStorage.setItem(PARKING_KEY, JSON.stringify(sampleParking));
  }
  if (!localStorage.getItem(BOOKINGS_KEY)) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(PROVIDER_SPOTS_KEY)) {
    localStorage.setItem(PROVIDER_SPOTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(NOTIFICATIONS_KEY)) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([]));
  }
}

export function getEvents() {
  return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]");
}

export function getParking() {
  const providerSpots = JSON.parse(localStorage.getItem(PROVIDER_SPOTS_KEY) || "[]");
  
  
  const convertedProviderSpots = providerSpots.map(spot => ({
    id: `provider_${spot.id}`,
    name: spot.location,
    address: spot.location,
    eventId: spot.eventId || "", // Now pulled from spot's eventId field (created by provider)
    eventName: spot.eventName || "", // Event name from provider
    slots: parseInt(spot.totalSlots) || 10, 
    available: parseInt(spot.available) || parseInt(spot.totalSlots) || 10, 
    pricePerHour: parseInt(spot.price),
    isProviderSpot: true,
    providerId: spot.providerId,
    providerName: spot.providerName || "Provider",
    advancePaymentAllowed: spot.advancePaymentAllowed || false,
    details: spot.details,
    createdAt: spot.createdAt
  }));

  // Return  provider spots 
  return convertedProviderSpots;
}

export function saveParking(arr) {
  localStorage.setItem(PARKING_KEY, JSON.stringify(arr));
}

export function getBookings() {
  return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]");
}

export function saveBookings(arr) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(arr));
}


export function getProviderSpots() {
  return JSON.parse(localStorage.getItem(PROVIDER_SPOTS_KEY) || "[]");
}

export function saveProviderSpots(arr) {
  localStorage.setItem(PROVIDER_SPOTS_KEY, JSON.stringify(arr));
}

// Notifications functions
export function getNotifications() {
  return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]");
}

export function saveNotifications(arr) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(arr));
}


export function addProviderSpot(spot) {
  const existingSpots = getProviderSpots();
  const newSpot = {
    ...spot,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    totalSlots: parseInt(spot.totalSlots) || 10, // Total parking slots
    available: parseInt(spot.totalSlots) || 10   // Initially all slots available
  };
  const updatedSpots = [...existingSpots, newSpot];
  saveProviderSpots(updatedSpots);
  
  // Trigger parking update event
  window.dispatchEvent(new Event('parking-updated'));
  
  return newSpot;
}

//  function to reduce availability when booking is confirmed
export function reduceSpotAvailability(spotId) {
  const providerSpots = getProviderSpots();
  const updatedSpots = providerSpots.map(spot => {
    if (`provider_${spot.id}` === spotId && spot.available > 0) {
      return { ...spot, available: spot.available - 1 };
    }
    return spot;
  });
  saveProviderSpots(updatedSpots);
  
  // Trigger parking update event
  window.dispatchEvent(new Event('parking-updated'));
  
  return updatedSpots;
}

//  function to restore availability when booking is cancelled
export function restoreSpotAvailability(spotId) {
  const providerSpots = getProviderSpots();
  const updatedSpots = providerSpots.map(spot => {
    if (`provider_${spot.id}` === spotId && spot.available < spot.totalSlots) {
      return { ...spot, available: spot.available + 1 };
    }
    return spot;
  });
  saveProviderSpots(updatedSpots);
  
  // Trigger parking update event
  window.dispatchEvent(new Event('parking-updated'));
  
  return updatedSpots;
}

//  function to add a new booking with availability management
export function addBooking(booking) {
  const existingBookings = getBookings();
  const newBooking = {
    ...booking,
    id: `b${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const updatedBookings = [...existingBookings, newBooking];
  saveBookings(updatedBookings);
  
  // If confirmed booking reduce availability 
  if (newBooking.status === 'confirmed') {
    reduceSpotAvailability(newBooking.spotId);
  }
  
  return newBooking;
}

//  function to add a new notification
export function addNotification(notification) {
  const existingNotifications = getNotifications();
  const newNotification = {
    ...notification,
    id: `n${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const updatedNotifications = [...existingNotifications, newNotification];
  saveNotifications(updatedNotifications);
  return newNotification;
}

// function to update booking status with availability management
export function updateBookingStatus(bookingId, status) {
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  
  if (!booking) return null;
  
  const oldStatus = booking.status;
  const updatedBookings = bookings.map(b => 
    b.id === bookingId ? { ...b, status } : b
  );
  saveBookings(updatedBookings);
  
  // Handle availability changes based on status change
  if (oldStatus === 'pending' && status === 'confirmed') {
    // Booking confirmed - reduce availability
    reduceSpotAvailability(booking.spotId);
  } else if (oldStatus === 'confirmed' && (status === 'cancelled' || status === 'rejected')) {
    // Booking cancelled/rejected - restore availability
    restoreSpotAvailability(booking.spotId);
  } else if (oldStatus === 'pending' && status === 'cancelled') {
    // Pending booking cancelled - no availability change needed
  }
  
  // Trigger update events
  window.dispatchEvent(new Event('booking-updated'));
  
  return updatedBookings.find(b => b.id === bookingId);
}

//  function to update notification status
export function updateNotificationStatus(notificationId, status) {
  const notifications = getNotifications();
  const updatedNotifications = notifications.map(notification => 
    notification.id === notificationId ? { ...notification, status } : notification
  );
  saveNotifications(updatedNotifications);
  return updatedNotifications.find(n => n.id === notificationId);
}

// function to cancel a booking with availability restoration
export function cancelBooking(bookingId) {
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  
  if (!booking) return null;
  
  // Update booking status to cancelled
  const updatedBookings = bookings.map(b => 
    b.id === bookingId ? { ...b, status: 'cancelled' } : b
  );
  saveBookings(updatedBookings);
  
  // Restore availability if it was a confirmed booking
  if (booking.status === 'confirmed') {
    restoreSpotAvailability(booking.spotId);
  }
  
  // Trigger update events
  window.dispatchEvent(new Event('booking-updated'));
  window.dispatchEvent(new Event('parking-updated'));
  
  return { ...booking, status: 'cancelled' };
}

//  function to get provider-specific data
export function getProviderData(providerId) {
  return {
    spots: getProviderSpots().filter(spot => spot.providerId === providerId),
    notifications: getNotifications().filter(notification => notification.providerId === providerId),
    bookings: getBookings().filter(booking => booking.providerId === providerId)
  };
}

//  function to get user-specific data
export function getUserData(userId) {
  return {
    bookings: getBookings().filter(booking => booking.userId === userId)
  };
}

//  function to get spot availability
export function getSpotAvailability(spotId) {
  const providerSpots = getProviderSpots();
  const spot = providerSpots.find(s => `provider_${s.id}` === spotId);
  return spot ? spot.available : 0;
}

//  function to check if spot has availability
export function hasAvailability(spotId) {
  return getSpotAvailability(spotId) > 0;
}