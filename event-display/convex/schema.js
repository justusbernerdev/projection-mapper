import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  submissions: defineTable({
    name: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("shown")
    ),
    createdAt: v.number(),
    shownAt: v.optional(v.number()),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
});
