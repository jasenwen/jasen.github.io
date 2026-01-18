import { GoogleGenAI } from "@google/genai";
import { ChartDataPoint } from "../types";

export const analyzeCapacityRisks = async (
  data: ChartDataPoint[],
  productLine: string
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "Gemini API Key is missing. Please check your environment configuration.";
    }

    // Initialize the client inside the function to ensure process.env.API_KEY is accessible at runtime
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      You are a Manufacturing Operations Manager. Analyze the following S&OP data for a discrete manufacturing plant.
      
      Product Line: ${productLine}
      
      Data (Next 4 Months):
      ${JSON.stringify(data.map(d => ({
        month: d.month,
        actualCapacity: d.actualCapacity,
        newOrders: d.demand,
        backlogToClear: d.backlog,
        totalRequired: d.totalRequirement,
        gap: d.actualCapacity - d.totalRequirement,
        theoreticalMax: d.theoreticalMax
      })), null, 2)}

      Task:
      Identify the critical months where Total Requirement (Orders + Backlog) exceeds Actual Capacity.
      Note that Actual Capacity may vary month-to-month based on user simulation.
      Analyze if the pressure is coming from new orders or backlog.
      Provide 3 concise, actionable recommendations to close the gap (e.g., increase shifts in specific months, prioritize backlog, or push out orders).
      Keep the tone professional and executive-brief style. Max 100 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    return response.text || "Unable to generate analysis at this time.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Graceful error handling for UI
    if (error.message?.includes("401")) {
       return "Authentication Error: Please check your API Key settings.";
    }
    return "AI Analysis service is currently unavailable. Please try again later.";
  }
};