import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as generatedClient } from "@/integrations/supabase/client";

// Backed by Lovable Cloud. The generated client owns the credentials; this module
// re-exports it (untyped against generated Database types, which lag behind
// migrations) plus the app's domain types.
export const supabase = generatedClient as unknown as SupabaseClient;

export type OpportunityType = "internship" | "job" | "freelance" | "hackathon";

export const OPPORTUNITY_TYPES: { value: OpportunityType; label: string }[] = [
  { value: "internship", label: "Internships" },
  { value: "job", label: "Full-time Jobs" },
  { value: "freelance", label: "Freelance" },
  { value: "hackathon", label: "Hackathons" },
];

export type Opportunity = {
  id: string;
  title: string;
  company: string;
  type: OpportunityType;
  location: string | null;
  is_remote: boolean;
  compensation: string | null;
  description: string | null;
  tags: string[] | null;
  apply_url: string | null;
  deadline: string | null;
  logo_url: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  headline: string | null;
  university: string | null;
  skills: string[] | null;
  avatar_url: string | null;
  resume_url: string | null;
};
