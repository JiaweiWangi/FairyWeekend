import type { ArchivedChapter } from "./persona-store";
import type { PostchainPrivacySettings, PostchainReport } from "./postchain-report";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const SHARE_KEY = "todaypersona:postchain-shares:v1";
const PLAYER_KEY = "default";

export interface PublicPostchainShare {
  id: string;
  createdAt: number;
  chapter: ArchivedChapter;
  report: PostchainReport;
  privacy: PostchainPrivacySettings;
  shareText: string;
}

function createShareId(): string {
  return `share-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadAllShares(): PublicPostchainShare[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SHARE_KEY) || "[]") as PublicPostchainShare[];
  } catch {
    return [];
  }
}

function saveAllShares(items: PublicPostchainShare[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHARE_KEY, JSON.stringify(items.slice(0, 50)));
}

export function savePublicPostchainShare(
  input: Omit<PublicPostchainShare, "id" | "createdAt">,
): PublicPostchainShare {
  const item: PublicPostchainShare = {
    ...input,
    id: createShareId(),
    createdAt: Date.now(),
  };
  saveAllShares([item, ...loadAllShares().filter((share) => share.id !== item.id)]);
  return item;
}

export function loadPublicPostchainShare(id: string | null): PublicPostchainShare | null {
  if (!id) return null;
  return loadAllShares().find((share) => share.id === id) ?? null;
}

export async function savePublicPostchainShareCloud(
  input: Omit<PublicPostchainShare, "id" | "createdAt">,
): Promise<PublicPostchainShare> {
  const item: PublicPostchainShare = {
    ...input,
    id: createShareId(),
    createdAt: Date.now(),
  };
  saveAllShares([item, ...loadAllShares().filter((share) => share.id !== item.id)]);
  try {
    const { error } = await supabase.from("postchain_shares").upsert(
      {
        id: item.id,
        player_key: PLAYER_KEY,
        chapter_id: item.chapter.chapterId,
        payload: item as unknown as Json,
        privacy: item.privacy as unknown as Json,
        share_text: item.shareText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) console.warn("[postchain share save]", error.message);
  } catch (error) {
    console.warn("[postchain share save]", error);
  }
  return item;
}

export async function loadPublicPostchainShareCloud(
  id: string | null,
): Promise<PublicPostchainShare | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from("postchain_shares")
      .select("payload")
      .eq("id", id)
      .maybeSingle();
    if (!error && data?.payload) {
      const share = data.payload as unknown as PublicPostchainShare;
      if (share?.id && share?.chapter && share?.report) {
        saveAllShares([share, ...loadAllShares().filter((item) => item.id !== share.id)]);
        return share;
      }
    }
    if (error) console.warn("[postchain share load]", error.message);
  } catch (error) {
    console.warn("[postchain share load]", error);
  }
  return loadPublicPostchainShare(id);
}
