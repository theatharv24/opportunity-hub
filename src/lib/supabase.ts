import { createClient } from "@supabase/supabase-js";

// Publishable (client-safe) credentials for the OpportunityHub Supabase project.
export const SUPABASE_URL = "https://iubqolpcuizwmngbkmev.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GJFMStuGPauyEIfudXzfog_fEbg0V2K";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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
