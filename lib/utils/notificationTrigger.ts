// Utility to trigger immediate notification refresh across the app
export const triggerNotificationRefresh = () => {
  // Trigger storage event for cross-tab notification refresh
  localStorage.setItem('notification-refresh', Date.now().toString());
  
  // Dispatch custom event for same-tab notification refresh
  window.dispatchEvent(new CustomEvent('refresh-notifications'));
  
  // Also trigger message count refresh
  window.dispatchEvent(new CustomEvent('refresh-message-counts'));
};

// Utility to listen for notification refresh events
export const onNotificationRefresh = (callback: () => void) => {
  const handleRefresh = () => callback();
  
  window.addEventListener('refresh-notifications', handleRefresh);
  
  return () => {
    window.removeEventListener('refresh-notifications', handleRefresh);
  };
};