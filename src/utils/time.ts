export function parseDuration(durationStr: string): number | null {
  if (!durationStr) return null;

  const match = durationStr.trim().match(/^(\d+)\s*(s|m|h|d|w|sec|secs|min|mins|hour|hours|day|days|week|weeks)?$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();

  switch (unit) {
    case 's':
    case 'sec':
    case 'secs':
      return value * 1000;
    case 'm':
    case 'min':
    case 'mins':
      return value * 60 * 1000;
    case 'h':
    case 'hour':
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'd':
    case 'day':
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
    case 'week':
    case 'weeks':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} Hari`);
  if (hours > 0) parts.push(`${hours} Jam`);
  if (minutes > 0) parts.push(`${minutes} Menit`);
  if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds} Detik`);

  return parts.length > 0 ? parts.join(' ') : '0 Detik';
}
