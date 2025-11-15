"use client";

import { useMemo, useState } from "react";
import Card from "@/components/common/Card";
import Tag from "@/components/common/Tag";
import type { Track } from "@/types/content";

type TrackExplorerProps = {
  placeholder: string;
  tags: string[];
  tracks: Track[];
};

export default function TrackExplorer({
  placeholder,
  tags,
  tracks,
}: TrackExplorerProps) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("Все");

  const filtered = useMemo(() => {
    return tracks.filter((track) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        track.title.toLowerCase().includes(q) ||
        track.description.toLowerCase().includes(q);
      const matchTag = selectedTag === "Все" || track.tags.includes(selectedTag);
      return matchQuery && matchTag;
    });
  }, [query, selectedTag, tracks]);

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          {placeholder}
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-12 rounded-2xl border border-brand-border px-4 text-base text-brand-text outline-none transition focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Tag
            variant={selectedTag === "Все" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedTag("Все")}
          >
            Все
          </Tag>
          {tags.map((tag) => (
            <Tag
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </Tag>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((track) => (
          <Card key={track.id} className="flex flex-col gap-3">
            <p className="text-lg font-semibold text-brand-text">{track.title}</p>
            <p className="text-sm text-slate-600">{track.description}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              {track.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="text-center text-sm text-slate-500">
            Нет треков по выбранным фильтрам — попробуйте другой поиск.
          </Card>
        )}
      </div>
    </div>
  );
}
