
export const formatTimestamp = (ts: number): string => {
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
   if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString();
};

export const formatPresenceTimestamp = (ts: number): string => {
  const date = new Date(ts);
  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) {
    return 'Last seen just now';
  }
  if (diffSeconds < 3600) {
    return `Last seen ${Math.floor(diffSeconds / 60)}m ago`;
  }
  
  const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

  if (date.toDateString() === now.toDateString()) {
    return `Last seen today at ${date.toLocaleTimeString([], timeFormat)}`;
  }
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${date.toLocaleTimeString([], timeFormat)}`;
  }

  return `Last seen on ${date.toLocaleDateString()}`;
}

export const formatCallDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
        return '00:00';
    }
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString()}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}