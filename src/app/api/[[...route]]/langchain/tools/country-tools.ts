import { DynamicTool } from "langchain/tools";

export const getCountryInfoTool = new DynamicTool({
  name: "get_country_info",
  description:
    "Gets economic and social information about a country. Input should be exactly the country name (e.g., 'India', 'United Kingdom').",
  func: async (countryName) => {
    try {
      const normalizedName = countryName.trim();

      if (!normalizedName) {
        return "Please provide a valid country name.";
      }

      // Special case for UK
      const searchName =
        normalizedName.toLowerCase() === "uk" ||
        normalizedName.toLowerCase() === "britain"
          ? "United Kingdom"
          : normalizedName;

      const response = await fetch(
        `https://api.api-ninjas.com/v1/country?name=${encodeURIComponent(searchName)}`,
        {
          headers: {
            "X-Api-Key": "w6j0Cqy2hKPDnvt/3WmrcQ==WEgf1o1yDot9VgJv",
          },
        },
      );

      if (!response.ok) {
        return `API request failed with status ${response.status}. Please try another country.`;
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return `No information found for ${normalizedName}. Please try another country or check the spelling.`;
      }

      const countryInfo = data[0];

      // Formatted data
      const info = {
        name: countryName,
        gdp: countryInfo.gdp ? (countryInfo.gdp / 1000).toFixed(2) : "N/A", // Convert to trillions
        gdp_growth: countryInfo.gdp_growth?.toFixed(1) || "N/A",
        unemployment: countryInfo.unemployment?.toFixed(1) || "N/A",
        co2_emissions: countryInfo.co2_emissions?.toFixed(1) || "N/A",
        population: countryInfo.population
          ? (countryInfo.population / 1000000).toFixed(2)
          : "N/A", // converted to millions
        capital: countryInfo.capital || "N/A",
        currency: countryInfo.currency?.name || "N/A",
        region: countryInfo.region || "N/A",
      };

      return `
Country: ${info.name}
GDP: ${info.gdp} trillion USD
GDP Growth: ${info.gdp_growth}%
Unemployment: ${info.unemployment}%
CO2 Emissions: ${info.co2_emissions} metric tons
Population: ${info.population} million
Capital: ${info.capital}
Currency: ${info.currency}
Region: ${info.region}
      `.trim();
    } catch (error: any) {
      console.error("Country info error:", error);
      return `Error getting country information: ${error.message}. Please try again with a different country.`;
    }
  },
});
