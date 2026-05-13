import type { CollectionEntry } from "astro:content";
import postFilter from "./postFilter";

function toTimestamp(modDatetime: Date | string | null | undefined, pubDatetime: Date | string): number {
  return (modDatetime ? new Date(modDatetime) : new Date(pubDatetime)).getTime();
}

const getSortedPosts = (posts: CollectionEntry<"blog">[]) => {
  return posts
    .filter(postFilter)
    .sort((a, b) => {
      // Pinned posts always come first
      const aPin = a.data.pin ?? false;
      const bPin = b.data.pin ?? false;
      if (aPin !== bPin) return bPin ? 1 : -1;
      // Within same pin level, sort by date descending
      return (
        Math.floor(toTimestamp(b.data.modDatetime, b.data.pubDatetime) / 1000) -
        Math.floor(toTimestamp(a.data.modDatetime, a.data.pubDatetime) / 1000)
      );
    });
};

export default getSortedPosts;