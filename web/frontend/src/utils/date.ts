import { t } from 'i18next';

function calculateRelativeTime(date: Date): string {
    const now = new Date();
    const differenceMs = now.getTime() - date.getTime();
    const seconds = Math.floor(differenceMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return t('utils.date.daysAgo', { count: days });
    } else if (hours > 0) {
        return t('utils.date.hoursAgo', { count: hours });
    } else if (minutes > 0) {
        return t('utils.date.minutesAgo', { count: minutes });
    } else {
        return t('utils.date.secondsAgo', { count: seconds });
    }
}

const ignoreTimezone = (date: Date): Date => {
    const timezoneOffset = date.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
    return new Date(date.getTime() + timezoneOffset);
}
export const dateUtils = {
  calculateRelativeTime,
  ignoreTimezone,
}