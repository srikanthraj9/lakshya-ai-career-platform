import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { roadmapService } from "@/services/roadmap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Rocket, CheckCircle2, Circle, Loader2, Map } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import type { RoadmapStage } from "@/types";

const experienceLevels = ["Beginner", "Intermediate", "Advanced"];
const estimatedDurations: Record<number, string> = { 0: "2-3 months", 1: "3-6 months", 2: "6-12 months" };

export default function RoadmapPage() {
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [roadmap, setRoadmap] = useState<RoadmapStage[]>([]);

  const mutation = useMutation({
    mutationFn: () => roadmapService.generate(role),
    onSuccess: (data) => setRoadmap(data.roadmap),
    onError: () => toast.error("Failed to generate roadmap. Please try again."),
  });

  const handleGenerate = useCallback(() => mutation.mutate(), [mutation]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Skill Roadmap Generator</h1>
          <p className="text-muted-foreground">Get a personalized learning path for your target role.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card glass-card-hover rounded-2xl p-6 space-y-4"
        >
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role, e.g. AI Engineer" className="bg-secondary/30" aria-label="Target role" />
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger className="bg-secondary/30" aria-label="Current experience level">
              <SelectValue placeholder="Current experience level" />
            </SelectTrigger>
            <SelectContent>
              {experienceLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="gradient" className="w-full" onClick={handleGenerate} disabled={!role || !experience || mutation.isPending} aria-label="Generate roadmap">
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
            Generate Roadmap
          </Button>
        </motion.div>

        {mutation.isPending && (
          <div className="space-y-6" role="status" aria-label="Generating roadmap">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        )}

        {!mutation.isPending && roadmap.length === 0 && !mutation.isSuccess && (
          <EmptyState
            icon={Map}
            title="Generate Your Roadmap"
            description="Enter a target role and experience level above to get a personalized learning path."
          />
        )}

        {roadmap.length > 0 && (
          <div className="relative" role="list" aria-label="Learning roadmap">
            <div className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-primary via-accent to-transparent" aria-hidden="true" />
            {roadmap.map((stage, i) => (
              <motion.div key={stage.stage} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="relative mb-8 ml-14" role="listitem">
                <div className="absolute -left-[2.6rem] top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background" aria-hidden="true">
                  {i === 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="glass-card glass-card-hover rounded-2xl p-6">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-foreground">{stage.stage}</h3>
                    <span className="text-xs text-muted-foreground">{estimatedDurations[i] ?? "Ongoing"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label={`${stage.stage} skills`}>
                    {stage.skills.map((skill, si) => (
                      <motion.div key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.15 + si * 0.03 }} role="listitem">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">{skill}</Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
