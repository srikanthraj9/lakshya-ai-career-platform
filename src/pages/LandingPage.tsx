import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileSearch, Target, MessageSquare, TrendingUp, Briefcase, BarChart3,
  Compass, ArrowRight, Sparkles
} from "lucide-react";

const features = [
  { icon: FileSearch, title: "AI Resume Analysis", desc: "Get ATS scoring, skill detection and actionable feedback powered by AI." },
  { icon: Target, title: "Role Readiness Engine", desc: "Match your profile against target roles and find your readiness score." },
  { icon: MessageSquare, title: "Mock AI Interview", desc: "Practice with AI-driven interviews tailored to your target role." },
  { icon: TrendingUp, title: "Skill Gap Detection", desc: "Identify missing skills and get a personalized learning roadmap." },
  { icon: Briefcase, title: "Job Recommendation Engine", desc: "Discover jobs that match your skills and career aspirations." },
  { icon: BarChart3, title: "Career Analytics", desc: "Track your progress with detailed charts and performance insights." },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Compass className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold gradient-text">LakshyaAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
            <Button variant="gradient" asChild><Link to="/register">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-accent/8 blur-[100px]" />
        </div>

        <div className="container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-Powered Career Intelligence
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              <span className="gradient-text">LakshyaAI</span>
              <br />
              <span className="text-foreground">Your AI Career Compass</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Analyze your resume, align with dream roles, practice AI interviews, and discover career opportunities — all in one intelligent platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button variant="gradient" size="lg" className="text-base" asChild>
                <Link to="/register">
                  Get Started <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="glass" size="lg" className="text-base" asChild>
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Everything you need to <span className="gradient-text">accelerate your career</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Powered by advanced AI to give you actionable insights at every step.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass-card glass-card-hover group rounded-xl p-6"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} LakshyaAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
