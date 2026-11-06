// Edge Functions run in UTC: reproduce it so no date logic leans on the machine's time zone.
process.env.TZ = 'UTC';
