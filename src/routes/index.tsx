import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { OpportunityCard } from "@/components/opportunity-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { supabase, OPPORTUNITY_TYPES, type Opportunity } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OpportunityHub — Internships, Jobs, Freelance & Hackathons" },
      {
        name: "description",
        content:
          "Browse curated internships, full-time jobs, freelance projects and hackathons for students. Save what you like and track every application.",
      },
      { property: "og:title", content: "OpportunityHub — Opportunities for students" },
      {
        property: "og:description",
        content:
          "One place to discover internships, jobs, freelance gigs and hackathons, with saves and application tracking.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("all");

  const opportunities = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });

  const saved = useQuery({
    queryKey: ["saved-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_opportunities").select("opportunity_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.opportunity_id as string);
    },
  });

  const filtered = useMemo(() => {
    const list = opportunities.data ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((o) => {
      const matchesType = type === "all" || o.type === type;
      const matchesQuery =
        !q ||
        o.title.toLowerCase().includes(q) ||
        o.company.toLowerCase().includes(q) ||
        (o.location ?? "").toLowerCase().includes(q) ||
        (o.tags ?? []).some((t) => t.toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [opportunities.data, query, type]);

  async function toggleSave(id: string) {
    if (!user) {
      toast.error("Sign in to save opportunities");
      return;
    }
    const isSaved = (saved.data ?? []).includes(id);
    if (isSaved) {
      const { error } = await supabase
        .from("saved_opportunities")
        .delete()
        .eq("opportunity_id", id)
        .eq("user_id", user.id);
      if (error) return toast.error(error.message);
      toast.success("Removed from saved");
    } else {
      const { error } = await supabase
        .from("saved_opportunities")
        .insert({ opportunity_id: id, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("Saved to your hub");
    }
    queryClient.invalidateQueries({ queryKey: ["saved-ids"] });
    queryClient.invalidateQueries({ queryKey: ["saved-list"] });
  }

  const counts = useMemo(() => {
    const list = opportunities.data ?? [];
    return OPPORTUNITY_TYPES.reduce<Record<string, number>>((acc, t) => {
      acc[t.value] = list.filter((o) => o.type === t.value).length;
      return acc;
    }, {});
  }, [opportunities.data]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="grain-hero border-b border-border/70">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-brand" /> Built for students, not recruiters
          </span>
          <h1 className="text-balance-tight mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold sm:text-6xl">
            Every opportunity worth your time, in one calm place.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Internships, full-time roles, freelance projects and hackathons — search once, save what
            fits, and track each application to the finish line.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search role, company, skill or city"
                className="h-12 rounded-xl bg-surface pl-10 shadow-soft"
                aria-label="Search opportunities"
              />
            </div>
            {!user && (
              <Button asChild size="lg" className="h-12 rounded-xl">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start tracking <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {OPPORTUNITY_TYPES.map((t) => (
              <div key={t.value} className="surface-card p-4">
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">{t.label}</dt>
                <dd className="font-display mt-1 text-2xl font-semibold">
                  {opportunities.isLoading ? "—" : (counts[t.value] ?? 0)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Open opportunities</h2>
          <div className="flex flex-wrap gap-2">
            {[{ value: "all", label: "All" }, ...OPPORTUNITY_TYPES].map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  type === t.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {opportunities.isError && (
          <div className="surface-card mt-8 p-6 text-sm">
            <p className="font-medium">Couldn't load opportunities.</p>
            <p className="mt-1 text-muted-foreground">
              Run <code className="rounded bg-muted px-1">db/opportunityhub-schema.sql</code> in
              your Supabase SQL editor to create the tables and seed data.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          {filtered.map((o) => (
            <OpportunityCard
              key={o.id}
              opportunity={o}
              saved={(saved.data ?? []).includes(o.id)}
              onToggleSave={toggleSave}
            />
          ))}
        </div>

        {!opportunities.isLoading && !opportunities.isError && filtered.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No opportunities match that search yet.
          </p>
        )}
      </main>

      <footer className="border-t border-border/70 py-10">
        <div className="mx-auto w-full max-w-6xl px-5 text-sm text-muted-foreground">
          OpportunityHub — internships, jobs, freelance and hackathons for students.
        </div>
      </footer>
    </div>
  );
}
