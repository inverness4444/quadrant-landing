import Link from "next/link";
import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";
import Tag from "@/components/common/Tag";
import { getAllPosts } from "@/services/blogService";
import PostsFilter from "@/components/sections/home/PostsFilter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Блог Quadrant — внутренняя мобильность и навыки",
  description:
    "Статьи о внутренних квестах, навыках и data-driven подходе к развитию людей.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const posts = await getAllPosts();
  const params = await searchParams;
  const activeTag = params.tag;
  const filtered = activeTag
    ? posts.filter((post) => post.tags.includes(activeTag))
    : posts;
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags)));

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Блог"
        title="Знания и практики Quadrant"
        subtitle="Делимся опытом, как строить внутренние квесты и честные карьерные треки."
      />
      <PostsFilter tags={tags} activeTag={activeTag} />
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((post) => (
          <Card key={post.slug} className="flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase text-slate-500">{post.date}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="text-lg font-semibold text-brand-text transition hover:text-brand-primary"
              >
                {post.title}
              </Link>
              <p className="text-sm text-slate-600">{post.description}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Tag key={tag} variant="outline">
                  {tag}
                </Tag>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
