import { createServerFn } from "@tanstack/react-start";

export const getAmapKey = createServerFn({ method: "GET" })
  .handler(async () => {
    return { key: process.env.AMAP_WEB_API_KEY || "" };
  });
