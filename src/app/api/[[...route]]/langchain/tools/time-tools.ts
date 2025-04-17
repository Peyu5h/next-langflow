import { DynamicTool } from "langchain/tools";
import { formatToTimeZone } from "date-fns-timezone";

export const getTimeTool = new DynamicTool({
  name: "get_time_for_timezone",
  description:
    "Gets the current time for a specific location. Input should be exactly 'London' or 'India'",
  func: async (location) => {
    try {
      const timezone =
        location.toLowerCase() === "london" ? "Europe/London" : "Asia/Kolkata";

      const currentTime = new Date();
      const time = formatToTimeZone(currentTime, "HH:mm", {
        timeZone: timezone,
      });
      return `Current time in ${location}: ${time}`;
    } catch (error: any) {
      return `Error getting time: ${error.message}`;
    }
  },
});

export const compareTimeTool = new DynamicTool({
  name: "compare_times",
  description: "Shows current time in both London and India",
  func: async () => {
    try {
      const currentTime = new Date();
      const londonTime = formatToTimeZone(currentTime, "HH:mm", {
        timeZone: "Europe/London",
      });
      const indiaTime = formatToTimeZone(currentTime, "HH:mm", {
        timeZone: "Asia/Kolkata",
      });
      return `Current time - London: ${londonTime}, India: ${indiaTime}`;
    } catch (error: any) {
      return `Error comparing times: ${error.message}`;
    }
  },
});
