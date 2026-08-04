import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ExternalLink,
  MapPin,
  Wifi,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { supabase, type Opportunity } from "@/lib/supabase";

export const Route = createFileRoute("/opportunities/$id")({
  head: () => ({
    meta: [
      { title: "Opportunity details — OpportunityHub" },
      {
        name: "description",
        content:
          "Read the full brief, save the listing, and apply directly from OpportunityHub in a couple of clicks.",
      },
      { property: "og:title", content: "Opportunity details — OpportunityHub" },
      {
        property: "og:description",
        content: "Full details, deadline and application link for this student opportunity.",
      },
    ],
  }),
  component: OpportunityDetail,
});

const typeLabel: Record<string, string> = {
  internship: "Internship",
  job: "Full-time job",
  freelance: "Freelance project",
  hackathon: "Hackathon",
};

function OpportunityDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const opportunity = useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Opportunity | null;
    },
  });

  const saved = useQuery({
    queryKey: ["saved-one", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select("id")
        .eq("opportunity_id", id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const application = useQuery({
    queryKey: ["application", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, status")
        .eq("opportunity_id", id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; status: string } | null;
    },
  });

  async function toggleSave() {
    if (!user) {
      toast.error("Sign in to save this opportunity");
      return;
    }
    if (saved.data) {
      const { error } = await supabase
        .from("saved_opportunities")
        .delete()
        .eq("opportunity_id", id)
        .eq("user_id", user.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Removed from saved");
    } else {
      const { error } = await supabase
        .from("saved_opportunities")
        .insert({ opportunity_id: id, user_id: user.id });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Saved to your hub");
    }
    queryClient.invalidateQueries({ queryKey: ["saved-one"] });
    queryClient.invalidateQueries({ queryKey: ["saved-ids"] });
    queryClient.invalidateQueries({ queryKey: ["saved-list"] });
  }

  async function apply() {
    if (!user) {
      toast.error("Sign in to track this application");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("applications")
      .insert({ opportunity_id: id, user_id: user.id, cover_note: note || null });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Application tracked");
    setNote("");
    queryClient.invalidateQueries({ queryKey: ["application"] });
    queryClient.invalidateQueries({ queryKey: ["applications-list"] });
  }

  const o = opportunity.data;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-5 py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/">
            <ArrowLeft className="size-4" /> All opportunities
          </Link>
        </Button>

        {opportunity.isLoading && <Skeleton className="mt-6 h-64 rounded-xl" />}

        {!opportunity.isLoading && !o && (
          <p className="mt-8 text-sm text-muted-foreground">This opportunity no longer exists.</p>
        )}

        {o && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <article className="surface-card p-7">
              <span className="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent-foreground">
                {typeLabel[o.type] ?? o.type}
              </span>
              <h1 className="mt-3 text-3xl leading-tight font-semibold">{o.title}</h1>
              <p className="mt-1 text-muted-foreground">{o.company}</p>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {o.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" /> {o.location}
                  </span>
                )}
                {o.is_remote && (
                  <span className="inline-flex items-center gap-1.5">
                    <Wifi className="size-4" /> Remote friendly
                  </span>
                )}
                {o.deadline && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-4" />
                    Closes {new Date(o.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>

              {o.description && (
                <p className="mt-6 leading-relaxed whitespace-pre-line text-foreground/90">
                  {o.description}
                </p>
              )}

              {o.tags && o.tags.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {o.tags.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <aside className="surface-card h-fit p-6">
              {o.compensation && (
                <>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Compensation
                  </p>
                  <p className="font-display mt-1 text-xl font-semibold">{o.compensation}</p>
                </>
              )}

              <div className="mt-5 space-y-3">
                {o.apply_url && (
                  <Button asChild className="w-full" size="lg">
                    <a href={o.apply_url} target="_blank" rel="noreferrer noopener">
                      Apply on site <ExternalLink className="size-4" />
                    </a>
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={toggleSave}>
                  {saved.data ? (
                    <>
                      <BookmarkCheck className="size-4" /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="size-4" /> Save for later
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-6 border-t border-border pt-5">
                {application.data ? (
                  <p className="text-sm text-muted-foreground">
                    Tracked in your hub —{" "}
                    <span className="font-medium text-foreground">
                      {application.data.status.replace("_", " ")}
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Track this application</p>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Note to self: who you contacted, what you sent…"
                      className="mt-2 min-h-24"
                    />
                    <Button className="mt-3 w-full" variant="secondary" onClick={apply} disabled={busy}>
                      Add to my tracker
                    </Button>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
