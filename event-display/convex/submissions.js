import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const submit = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const trimmed = name.trim().slice(0, 30);
    if (!trimmed) throw new Error("Name required");
    await ctx.db.insert("submissions", {
      name: trimmed,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("submissions"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("shown")
    ),
  },
  handler: async (ctx, { id, status }) => {
    const update = { status };
    if (status === "shown") update.shownAt = Date.now();
    await ctx.db.patch(id, update);
  },
});

export const remove = mutation({
  args: { id: v.id("submissions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200);
  },
});

export const listApproved = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .take(50);
  },
});

export const totalCount = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("submissions").collect();
    return all.length;
  },
});
