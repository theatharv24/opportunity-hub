import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Compass, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — OpportunityHub" },
      {
        name: "description",
        content: "Choose a new password for your OpportunityHub account and get back to your saved opportunities.",
      },
      { property: "og:title", content: "Set a new password — OpportunityHub" },
      {
        property: "og:description",
        content: "Choose a new password for your OpportunityHub account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — you're signed in.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not update the password. Request a new reset link.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grain-hero flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </span>
          <span className="font-display font-semibold">
            Opportunity<span className="text-brand">Hub</span>
          </span>
        </Link>

        <div className="surface-card mt-6 p-7">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Open this page from the reset link in your email, then choose a new password.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Update password
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link to="/auth" className="font-medium text-brand hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
