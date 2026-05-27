import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://rpyedeumapqwtlumlojb.supabase.co",
  "sb_publishable_yDFj0_0vtwFUXinOehfrbw_ubuLfH4Q",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export const CURRENT_GAME_ID = "current-game";
