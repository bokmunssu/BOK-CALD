// Google holiday subscriptions include memorial days as well as public holidays.
// Detect the provider's calendar ID, never the user's event title.
export const isHolidayCalendar = (id?: string) => !!id && /(?:#holiday@group\.v\.calendar\.google\.com|@holiday\.calendar\.google\.com)$/i.test(id);
