import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

export type BlogPostMeta = {
  title: string;
  date: string;
  description: string;
  tags: string[];
  slug: string;
};

export type BlogPost = BlogPostMeta & {
  content: string;
};

const blogDir = path.join(process.cwd(), "content", "blog");

export async function getAllPosts(): Promise<BlogPostMeta[]> {
  const files = await fs.readdir(blogDir);
  const posts = await Promise.all(
    files.map(async (filename) => {
      const filePath = path.join(blogDir, filename);
      const file = await fs.readFile(filePath, "utf-8");
      const { data } = matter(file);
      return data as BlogPostMeta;
    }),
  );
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(blogDir, `${slug}.md`);
  try {
    const file = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(file);
    const html = marked.parse(content);
    return { ...(data as BlogPostMeta), content: html as string };
  } catch {
    return null;
  }
}
