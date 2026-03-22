import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { liveJobsService } from "@/services/liveJobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { MapPin, Building2, ExternalLink, Globe } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";

export default function LiveJobsPage() {
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["live-jobs"],
    queryFn: liveJobsService.getLiveJobs,
  });

  const filtered = jobs?.filter((j) => {
    if (locationFilter && !j.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (typeFilter === "remote" && !j.location.toLowerCase().includes("remote")) return false;
    if (typeFilter === "onsite" && j.location.toLowerCase().includes("remote")) return false;
    return true;
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Live Job Board</h1>
          <p className="text-muted-foreground">Real-time job opportunities matched to your skills.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Filter by location..." className="w-60 bg-secondary/30" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 bg-secondary/30"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((job, i) => (
              <motion.div key={`${job.company}-${job.title}-${i}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between gap-4">
                <div>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="rounded-full bg-chart-4/15 px-3 py-1 text-xs font-semibold text-chart-4">{job.match_percent}% Match</div>
                  </div>
                  <h3 className="font-display font-semibold text-foreground">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.skills.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="mr-1 h-3 w-3" /> Apply
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {filtered?.length === 0 && (
          <EmptyState
            icon={Globe}
            title="No Jobs Found"
            description="No jobs match your current filters. Try adjusting your search criteria."
          />
        )}
      </div>
    </PageTransition>
  );
}
