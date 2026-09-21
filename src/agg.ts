import {
  getNextFeedToFetch,
  markFeedFetched,
} from "./lib/db/queries/feeds.js";
import { createPost } from "./lib/db/queries/posts.js";
import { fetchFeed } from "./rss.js";

export function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(
      "Invalid duration. Use a value such as 500ms, 1s, 1m, or 1h",
    );
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error("Invalid duration unit");
  }
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h${minutes}m${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }

  return `${seconds}s`;
}

function parsePublishedDate(dateString: string): Date | null {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    console.error(`Invalid published date: ${dateString}`);
    return null;
  }

  return date;
}

export async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();

  if (!feed) {
    console.log("No feeds found");
    return;
  }

  console.log(`Fetching feed: ${feed.name}`);
  console.log(`URL: ${feed.url}`);

  const rssFeed = await fetchFeed(feed.url);

  for (const item of rssFeed.channel.item) {
    const publishedAt = parsePublishedDate(item.pubDate);

    await createPost({
      title: item.title,
      url: item.link,
      description: item.description || null,
      publishedAt,
      feedId: feed.id,
    });
  }

  await markFeedFetched(feed.id);

  console.log(
    `Saved posts from ${feed.name} at ${new Date().toISOString()}`,
  );
}
