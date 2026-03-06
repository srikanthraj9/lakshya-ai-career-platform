import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { roadmapService } from "@/services/roadmap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Rocket, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
    onError: () => toast.error("Failed to generate roadmap."),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Skill Roadmap Generator</h1>
        <p className="text-muted-foreground">Get a personalized learning path for your target role.</p>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role, e.g. AI Engineer" className="bg-secondary/30" />
        <Select value={experience} onValueChange={setExperience}>
          <SelectTrigger className="bg-secondary/30">
            <SelectValue placeholder="Current experience level" />
          </SelectTrigger>
          <SelectContent>
            {experienceLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="gradient" className="w-full" onClick={() => mutation.mutate()} disabled={!role || !experience || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
          Generate Roadmap
        </Button>
      </div>

      {mutation.isPending && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      )}

      {roadmap.length > 0 && (
        <div className="relative">
          <div className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-primary via-accent to-transparent" />
          {roadmap.map((stage, i) => (
            <motion.div key={stage.stage} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="relative mb-8 ml-14">
              <div className="absolute -left-[2.6rem] top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                {i === 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="glass-card rounded-2xl p-6">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-foreground">{stage.stage}</h3>
                  <span className="text-xs text-muted-foreground">{estimatedDurations[i] ?? "Ongoing"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stage.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary">{skill}</Badge>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
