"use client";

import Link from "next/link";

type ShareButtonsProps = {
  slug: string;
};

export default function ShareButtons({ slug }: ShareButtonsProps) {
  const shareUrl = `https://quadrant.app/blog/${slug}`;

  return (
    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
      <span>Поделиться:</span>
      <Link
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        className="text-brand-link"
      >
        LinkedIn
      </Link>
      <Link
        href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
        className="text-brand-link"
      >
        X
      </Link>
      <button
        type="button"
        className="text-brand-link"
        onClick={() => {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl);
          }
        }}
      >
        Скопировать ссылку
      </button>
    </div>
  );
}
