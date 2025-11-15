"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Tag from "@/components/common/Tag";

type PostsFilterProps = {
  tags: string[];
  activeTag?: string;
};

export default function PostsFilter({ tags, activeTag }: PostsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setTag = (tag?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!tag) {
      params.delete("tag");
    } else {
      params.set("tag", tag);
    }
    const query = params.toString();
    router.replace(query ? `/blog?${query}` : "/blog");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Tag
        variant={!activeTag ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => setTag(undefined)}
      >
        Все
      </Tag>
      {tags.map((tag) => (
        <Tag
          key={tag}
          variant={activeTag === tag ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setTag(tag)}
        >
          {tag}
        </Tag>
      ))}
    </div>
  );
}
