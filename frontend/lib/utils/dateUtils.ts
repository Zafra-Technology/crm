/**
 * Formats a date string for chat message separators
 * - Today: "Today"
 * - Last 7 days: Day name (Monday, Tuesday, etc.)
 * - Older: DD-MM-YYYY format
 */
export function formatChatDate(timestamp: string): string {
  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time to compare only dates
  const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekAgo = new Date(todayOnly);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  // Check if it's today
  if (messageDateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  }
  
  // Check if it's within the last 7 days
  if (messageDateOnly >= weekAgo) {
    // Return day name
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[messageDate.getDay()];
  }
  
  // For older dates, return DD-MM-YYYY
  const day = String(messageDate.getDate()).padStart(2, '0');
  const month = String(messageDate.getMonth() + 1).padStart(2, '0');
  const year = messageDate.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Checks if two timestamps are on different days
 */
export function isDifferentDay(timestamp1: string, timestamp2: string): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  
  return (
    date1.getDate() !== date2.getDate() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getFullYear() !== date2.getFullYear()
  );
}

