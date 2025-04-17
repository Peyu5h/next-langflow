import { DynamicTool } from "langchain/tools";
import { formatToTimeZone } from "date-fns-timezone";

const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  india: "Asia/Kolkata",
  "united kingdom": "Europe/London",
  uk: "Europe/London",
  britain: "Europe/London",
  "united states": "America/New_York",
  usa: "America/New_York",
  us: "America/New_York",
  canada: "America/Toronto",
  australia: "Australia/Sydney",
  japan: "Asia/Tokyo",
  germany: "Europe/Berlin",
  france: "Europe/Paris",
  brazil: "America/Sao_Paulo",
  "south africa": "Africa/Johannesburg",
  china: "Asia/Shanghai",
  russia: "Europe/Moscow",
  mexico: "America/Mexico_City",
  spain: "Europe/Madrid",
  italy: "Europe/Rome",
  singapore: "Asia/Singapore",
  switzerland: "Europe/Zurich",
  "new zealand": "Pacific/Auckland",
};

export const getTimeTool = new DynamicTool({
  name: "get_time_for_timezone",
  description:
    "Gets the current time for a specific country. Input should be a country name like 'India', 'United Kingdom', 'United States', etc.",
  func: async (country) => {
    try {
      if (!country || typeof country !== "string") {
        return "Please provide a valid country name.";
      }

      const normalizedCountry = country.trim().toLowerCase();
      const timezone = COUNTRY_TIMEZONE_MAP[normalizedCountry];

      if (!timezone) {
        if (normalizedCountry.includes("europe"))
          return getTimeForTimezone("Europe/London", country);
        if (normalizedCountry.includes("asia"))
          return getTimeForTimezone("Asia/Singapore", country);
        if (normalizedCountry.includes("africa"))
          return getTimeForTimezone("Africa/Johannesburg", country);
        if (normalizedCountry.includes("america"))
          return getTimeForTimezone("America/New_York", country);
        if (normalizedCountry.includes("australia"))
          return getTimeForTimezone("Australia/Sydney", country);

        return `Sorry, I don't know the timezone for ${country}. Try a more common country name.`;
      }

      return getTimeForTimezone(timezone, country);
    } catch (error: any) {
      return `Error getting time: ${error.message}`;
    }
  },
});

function getTimeForTimezone(timezone: string, location: string) {
  const currentTime = new Date();
  const time = formatToTimeZone(currentTime, "HH:mm", {
    timeZone: timezone,
  });
  return `Current time in ${location}: ${time}`;
}
