/**
 * Tool: get_player_profile
 * 获取玩家历史画像和偏好
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export interface PlayerProfile {
  profile: string;
  loved_tags: string[];
  disliked_tags: string[];
  visited_pois: string[];
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEFAULT_PROFILE: PlayerProfile = {
  profile: "",
  loved_tags: [],
  disliked_tags: [],
  visited_pois: [],
};

export const getPlayerProfileTool = new DynamicStructuredTool({
  name: "get_player_profile",
  description:
    "获取玩家的历史画像和偏好。包含：画像描述、喜欢的标签、不喜欢的标签、去过的地方。用于个性化推荐。",
  schema: z.object({
    playerKey: z.string().describe("玩家唯一标识，如 user_abc123"),
  }),
  func: async ({ playerKey }) => {
    try {
      const { data, error } = await supabase
        .from("dm_memory")
        .select("*")
        .eq("player_key", playerKey)
        .single();

      if (error) {
        console.warn("Failed to fetch player profile:", error);
        return JSON.stringify(DEFAULT_PROFILE);
      }

      const profile: PlayerProfile = {
        profile: data?.profile ?? "",
        loved_tags: data?.loved_tags ?? [],
        disliked_tags: data?.disliked_tags ?? [],
        visited_pois: data?.visited_pois ?? [],
      };

      return JSON.stringify(profile);
    } catch (e) {
      console.warn("get_player_profile tool error:", e);
      return JSON.stringify(DEFAULT_PROFILE);
    }
  },
});
