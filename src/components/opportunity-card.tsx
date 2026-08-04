import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, MapPin, Wifi, CalendarDays } from "lucide-react";
import type { Opportunity } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

const typeLabel: Record<string, string> = {
  internship: "Internship",
  job: "Full-time",
  freelance: "Freelance",
  hackathon: "Hackathon",
};

export function OpportunityCard({
  opportunity,
  saved,
  onToggleSave,
}: {
  opportunity: Opportunity;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const deadline = opportunity.deadline
    ? new Date(opportunity.deadline).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <article className="surface-card surface-card-hover flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent-foreground">
            {typeLabel[opportunity.type] ?? opportunity.type}
          </span>
          <h3 className="mt-2.5 truncate text-lg font-semibold">
            <Link
              to="/opportunities/$id"
              params={{ id: opportunity.id }}
              className="hover:text-brand"
            >
              {opportunity.title}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">{opportunity.company}</p>
        </div>
        {onToggleSave && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={saved ? "Remove from saved" : "Save opportunity"}
            onClick={() => onToggleSave(opportunity.id)}
            className={saved ? "text-brand" : "text-muted-foreground"}
          >
            {saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
          </Button>
        )}
      </div>

      {opportunity.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {opportunity.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {opportunity.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {opportunity.location}
          </span>
        )}
        {opportunity.is_remote && (
          <span className="inline-flex items-center gap-1.5">
            <Wifi className="size-3.5" /> Remote
          </span>
        )}
        {deadline && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> {deadline}
          </span>
        )}
        {opportunity.compensation && (
          <span className="font-medium text-foreground">{opportunity.compensation}</span>
        )}
      </div>
    </article>
  );
}
