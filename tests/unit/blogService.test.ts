import { describe, expect, it } from "vitest";
import { getAllPosts, getPostBySlug } from "@/services/blogService";

describe("blogService", () => {
  it("lists posts sorted by date", async () => {
    const posts = await getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    const timestamps = posts.map((post) => new Date(post.date).getTime());
    const sorted = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sorted);
  });

  it("returns null for unknown slug", async () => {
    const post = await getPostBySlug("unknown");
    expect(post).toBeNull();
  });
});
