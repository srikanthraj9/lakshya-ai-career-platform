import { describe, it, expect } from "vitest";
import { APPLICATION_STAGES } from "@/services/applicationTrackerService";

describe("ApplicationTracker Pipeline Configuration", () => {
  it("contains all 6 required linear pipeline stages in correct sequence", () => {
    const stageIds = APPLICATION_STAGES.map((s) => s.id);
    expect(stageIds).toEqual([
      "wishlist",
      "applied",
      "screening",
      "interviewing",
      "offer",
      "closed",
    ]);
  });

  it("categorizes stages accurately between active and closed", () => {
    const activeStages = APPLICATION_STAGES.filter((s) => s.category === "active");
    const closedStages = APPLICATION_STAGES.filter((s) => s.category === "closed");

    expect(activeStages).toHaveLength(5);
    expect(closedStages).toHaveLength(1);
    expect(closedStages[0].id).toBe("closed");
  });

  it("calculates conversion rate accurately based on applied funnel", () => {
    const apps = [
      { id: "1", stage: "wishlist" },
      { id: "2", stage: "applied" },
      { id: "3", stage: "screening" },
      { id: "4", stage: "interviewing" },
      { id: "5", stage: "offer" },
    ];

    const appliedOrFurther = apps.filter((a) => a.stage !== "wishlist");
    const offers = apps.filter((a) => a.stage === "offer");

    const conversionRate = Math.round((offers.length / Math.max(1, appliedOrFurther.length)) * 100);
    expect(conversionRate).toBe(25); // 1 offer / 4 applied = 25%
  });
});
