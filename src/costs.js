export const COSTS = {
  checkedAt: "2026-06-05",
  source: "https://platform.mureka.ai/pricing",
  rechargePlansUsd: [
    { name: "Trial", amountUsd: 30, concurrentRequests: 1, validityMonths: 12 },
    { name: "Basic", amountUsd: 1000, concurrentRequests: 5, validityMonths: 12 },
    { name: "Standard", amountUsd: 3000, concurrentRequests: 15, validityMonths: 12 },
    { name: "Business", amountUsd: 5000, concurrentRequests: 25, validityMonths: 12 },
    { name: "Enterprise", amountUsd: 30000, concurrentRequests: 150, validityMonths: 12 }
  ],
  unitPricesUsd: {
    songGenerationV8OrV9: 0.045,
    songGenerationV76: 0.03,
    singleTrackGenerationV8: 0.09,
    stemExtractionV1: 0.06,
    stemExtractionV2: 0.7,
    lyricGenerationFull: 0.009,
    lyricGenerationLine: 0.002,
    vocalCloning: 5
  }
};
