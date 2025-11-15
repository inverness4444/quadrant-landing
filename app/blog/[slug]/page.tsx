import Link from "next/link";
import Tag from "@/components/common/Tag";
import SectionTitle from "@/components/common/SectionTitle";
import CTASection from "@/components/sections/shared/CTASection";
import ShareButtons from "@/components/sections/shared/ShareButtons";
import { getAllPosts, getPostBySlug } from "@/services/blogService";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Блог Quadrant`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return notFound();

  return (
    <article className="space-y-6 rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
      <Link href="/blog" className="text-sm text-brand-link transition hover:opacity-80">
        ← Назад к списку
      </Link>
      <SectionTitle title={post.title} subtitle={post.description} />
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>{post.date}</span>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Tag key={tag} variant="outline">
              {tag}
            </Tag>
          ))}
        </div>
      </div>
      <div
        className="prose max-w-none prose-h2:text-brand-text prose-p:text-slate-700"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      <ShareButtons slug={post.slug} />
      <CTASection
        title="Хотите обсудить Quadrant?"
        subtitle="Расскажите о задачах — покажем демо и кейсы."
        actions={[{ label: "Запросить демо", href: "/contact", variant: "primary" }]}
      />
    </article>
  );
}
