import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PostchainAuthLevel, PostchainPrivacySettings } from "./postchain-report";

const PLAYER_KEY = "default";

export interface PostchainConsent {
  authLevel: PostchainAuthLevel;
  privacy: PostchainPrivacySettings;
  updatedAt: string;
}

function isAuthLevel(value: unknown): value is PostchainAuthLevel {
  return value === "basic" || value === "personal" || value === "full";
}

export async function savePostchainConsentCloud(
  authLevel: PostchainAuthLevel,
  privacy: PostchainPrivacySettings,
): Promise<void> {
  try {
    const { error } = await supabase.from("postchain_consents").upsert(
      {
        player_key: PLAYER_KEY,
        auth_level: authLevel,
        privacy: privacy as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_key" },
    );
    if (error) console.warn("[postchain consent save]", error.message);
  } catch (error) {
    console.warn("[postchain consent save]", error);
  }
}

export async function loadPostchainConsentCloud(): Promise<PostchainConsent | null> {
  try {
    const { data, error } = await supabase
      .from("postchain_consents")
      .select("auth_level,privacy,updated_at")
      .eq("player_key", PLAYER_KEY)
      .maybeSingle();
    if (error) {
      console.warn("[postchain consent load]", error.message);
      return null;
    }
    if (!data || !isAuthLevel(data.auth_level)) return null;
    return {
      authLevel: data.auth_level,
      privacy: data.privacy as unknown as PostchainPrivacySettings,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.warn("[postchain consent load]", error);
    return null;
  }
}
