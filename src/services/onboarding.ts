import api from "./api";
import type { CareerProfile, OnboardingStepPayload } from "@/types";

export const onboardingService = {
  async getProfile(): Promise<CareerProfile> {
    const res = await api.get("/onboarding/profile");
    return res.data;
  },

  async saveStep(data: OnboardingStepPayload): Promise<CareerProfile> {
    const res = await api.post("/onboarding/save-step", data);
    return res.data;
  },

  async complete(data: Partial<OnboardingStepPayload>): Promise<CareerProfile> {
    const res = await api.post("/onboarding/complete", data);
    return res.data;
  },
};
