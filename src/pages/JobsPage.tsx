import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobsService } from "@/services/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Briefcase, Building, Percent } from "lucide-react";

export default function JobsPage() {
  const [resumeId, setResumeId] = useState("");
  const [searchId, setSearchId] = useState("");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", searchId],
    queryFn: () => jobsService.getRecommendations(searchId),
    enabled: !!searchId,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Job Recommendations</h1>
        <p className="text-muted-foreground">Discover roles that match your profile.</p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-2">
          <Label>Resume ID</Label>
          <Input value={resumeId} onChange={(e) => setResumeId(e.target.value)} placeholder="Enter your resume ID" />
        </div>
        <Button variant="gradient" onClick={() => setSearchId(resumeId)} disabled={!resumeId}>
          Find Jobs
        </Button>
      </div>

      {isLoading && <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>}

      {jobs && (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-6 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> {job.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building className="h-3.5 w-3.5" /> {job.company}
                  </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Percent className="h-3 w-3" /> {job.match_percentage}%
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
