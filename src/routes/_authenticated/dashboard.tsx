import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bookmark, FileText, Trash2, Upload } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { OpportunityCard } from "@/components/opportunity-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase, type Opportunity, type Profile } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My hub — OpportunityHub" },
      {
        name: "description",
        content:
          "Your saved opportunities, application tracker and student profile, all in one private dashboard.",
      },
      { property: "og:title", content: "My hub — OpportunityHub" },
      {
        property: "og:description",
        content: "Saved listings, application statuses and your student profile.",
      },
    ],
  }),
  component: Dashboard,
});

const STATUSES = ["applied", "in_review", "interview", "offer", "rejected"] as const;

type ApplicationRow = {
  id: string;
  status: string;
  cover_note: string | null;
  created_at: string;
  opportunity: Opportunity | null;
};

function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const savedList = useQuery({
    queryKey: ["saved-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select("id, opportunity:opportunities(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; opportunity: Opportunity | null }[];
    },
  });

  const applications = useQuery({
    queryKey: ["applications-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, status, cover_note, created_at, opportunity:opportunities(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicationRow[];
    },
  });

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [university, setUniversity] = useState("");
  const [skills, setSkills] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setFullName(p.full_name ?? "");
    setHeadline(p.headline ?? "");
    setUniversity(p.university ?? "");
    setSkills((p.skills ?? []).join(", "));
  }, [profile.data]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      headline,
      university,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function uploadResume(file: File) {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, resume_url: path, updated_at: new Date().toISOString() });
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success("Résumé uploaded");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function unsave(opportunityId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("saved_opportunities")
      .delete()
      .eq("opportunity_id", opportunityId)
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["saved-list"] });
    queryClient.invalidateQueries({ queryKey: ["saved-ids"] });
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["applications-list"] });
  }

  async function deleteApplication(id: string) {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed from tracker");
    queryClient.invalidateQueries({ queryKey: ["applications-list"] });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-12">
        <h1 className="text-3xl font-semibold">My hub</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved opportunities, live application statuses and your student profile.
        </p>

        <Tabs defaultValue="saved" className="mt-8">
          <TabsList>
            <TabsTrigger value="saved">Saved ({savedList.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="applications">
              Applications ({applications.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-6">
            {savedList.isLoading && <Skeleton className="h-40 rounded-xl" />}
            {savedList.data?.length === 0 && (
              <div className="surface-card p-8 text-center">
                <Bookmark className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nothing saved yet.{" "}
                  <Link to="/" className="font-medium text-brand hover:underline">
                    Browse opportunities
                  </Link>
                </p>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(savedList.data ?? [])
                .filter((row) => row.opportunity)
                .map((row) => (
                  <OpportunityCard
                    key={row.id}
                    opportunity={row.opportunity!}
                    saved
                    onToggleSave={unsave}
                  />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="applications" className="mt-6 space-y-4">
            {applications.isLoading && <Skeleton className="h-40 rounded-xl" />}
            {applications.data?.length === 0 && (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                No applications tracked yet.
              </div>
            )}
            {(applications.data ?? []).map((app) => (
              <div
                key={app.id}
                className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {app.opportunity ? (
                      <Link
                        to="/opportunities/$id"
                        params={{ id: app.opportunity.id }}
                        className="hover:text-brand"
                      >
                        {app.opportunity.title}
                      </Link>
                    ) : (
                      "Removed opportunity"
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {app.opportunity?.company} · applied{" "}
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                  {app.cover_note && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {app.cover_note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={app.status} onValueChange={(v) => updateStatus(app.id, v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove application"
                    onClick={() => deleteApplication(app.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <form onSubmit={saveProfile} className="surface-card max-w-2xl space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="CS undergrad · frontend & design systems"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input
                  id="university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma separated)</Label>
                <Input
                  id="skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="React, Python, Figma"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume">Résumé (PDF)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="resume"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadResume(file);
                    }}
                  />
                  <Upload className="size-4 shrink-0 text-muted-foreground" />
                </div>
                {profile.data?.resume_url && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="size-3.5" /> Stored privately in your résumé bucket
                  </p>
                )}
              </div>

              <Button type="submit" disabled={saving}>
                Save profile
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
