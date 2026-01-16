import { GoogleGenAI } from "@google/genai";
import { ChartDataPoint, SimulationParams } from "../types";

export const analyzeCapacityRisks = async (
  data: ChartDataPoint[],
  params: SimulationParams
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "Gemini API Key is missing. Please check your environment configuration.";
    }

    // Initialize the client inside the function to ensure process.env.API_KEY is accessible at runtime
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Calculate aggregated stats for the prompt
    const totalMaintenance = params.devices.reduce((acc, d) => acc + d.maintenanceDays, 0);
    const totalOT = params.devices.reduce((acc, d) => acc + d.overtimeDays, 0);
    const avgShifts = (params.devices.reduce((acc, d) => acc + d.shifts, 0) / params.devices.length).toFixed(1);
    const totalCapacity = params.devices.reduce((acc, d) => acc + d.baseCapacity, 0);

    const prompt = `
      You are a Manufacturing Operations Manager. Analyze the following S&OP data for an automotive spark plug factory.
      
      Current Simulation Parameters:
      - Product Line: ${params.productLine}
      - Equipment Setup: ${params.devices.length} Devices
      - Avg Shifts: ${avgShifts}
      - Total Daily Base Capacity (All Devices per shift): ${totalCapacity}
      - Total Maintenance Days (All Devices): ${totalMaintenance}
      - Total Weekend OT Days (All Devices): ${totalOT}

      Data (Next 4 Months):
      ${JSON.stringify(data.map(d => ({
        month: d.month,
        maxCapacity: d.theoreticalMax,
        actualCapacity: d.actualCapacity,
        demand: d.demand,
        gap: d.actualCapacity - d.demand
      })), null, 2)}

      Task:
      Identify the critical months where demand exceeds actual capacity (if any).
      Provide 3 concise, actionable recommendations to close the gap based on the specific device configuration (e.g., increase shifts on high-capacity devices, reduce maintenance).
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