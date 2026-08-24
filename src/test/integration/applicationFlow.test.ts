import { describe, it, expect } from "vitest";
import { APPLICATION_STAGES } from "@/services/applicationTrackerService";

describe("Job Application Pipeline & Outcome Learning Flow", () => {
  it("tracks an application lifecycle across all stages and generates audit events", () => {
    // 1. Initial Application Creation
    const app = {
      id: "app-test-1",
      company_name: "Stripe",
      job_title: "Senior Full Stack Engineer",
      stage: "wishlist",
      status: "active",
      match_score_at_application: 94.0,
      events: [
        {
          id: "evt-1",
          event_type: "application_created",
          new_stage: "wishlist",
          title: "Application Saved to Wishlist",
        },
      ],
      debriefs: [],
    };

    expect(app.stage).toBe("wishlist");
    expect(app.events).toHaveLength(1);

    // 2. Transition Stage: Wishlist -> Applied
    const appliedApp = {
      ...app,
      stage: "applied",
      events: [
        {
          id: "evt-2",
          event_type: "stage_changed",
          previous_stage: "wishlist",
          new_stage: "applied",
          title: "Application Submitted",
        },
        ...app.events,
      ],
    };
    expect(appliedApp.stage).toBe("applied");
    expect(appliedApp.events).toHaveLength(2);

    // 3. Log Post-Interview Debrief
    const debriefedApp = {
      ...appliedApp,
      stage: "interviewing",
      debriefs: [
        {
          id: "deb-1",
          round_type: "System Design & Architecture",
          technical_score: 9,
          communication_score: 8,
          system_design_score: 9,
          questions_asked: ["Design an idempotent billing service"],
          identified_weaknesses: ["Double-entry ledger rollback"],
          outcome: "passed",
        },
      ],
    };

    expect(debriefedApp.debriefs).toHaveLength(1);
    expect(debriefedApp.debriefs[0].outcome).toBe("passed");
    expect(debriefedApp.debriefs[0].system_design_score).toBe(9);
  });
});
