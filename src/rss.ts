import { XMLParser } from "fast-xml-parser";

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function fetchFeed(
  feedURL: string,
): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    method: "GET",
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch feed: ${response.status} ${response.statusText}`,
    );
  }

  const xmlData = await response.text();

  const parser = new XMLParser({
    processEntities: false,
  });

  const parsedData: unknown = parser.parse(xmlData);

  if (!isObject(parsedData)) {
    throw new Error("Invalid RSS feed");
  }

  const rss = parsedData.rss;

  if (!isObject(rss)) {
    throw new Error("RSS field is missing");
  }

  const channel = rss.channel;

  if (!isObject(channel)) {
    throw new Error("RSS channel is missing");
  }

  const title = getValidString(channel.title);
  const link = getValidString(channel.link);
  const description = getValidString(channel.description);

  if (!title || !link || !description) {
    throw new Error("RSS channel metadata is invalid");
  }

  let rawItems: unknown[] = [];

  if ("item" in channel) {
    if (Array.isArray(channel.item)) {
      rawItems = channel.item;
    } else if (isObject(channel.item)) {
      rawItems = [channel.item];
    }
  }

  const items: RSSItem[] = [];

  for (const rawItem of rawItems) {
    if (!isObject(rawItem)) {
      continue;
    }

    const itemTitle = getValidString(rawItem.title);
    const itemLink = getValidString(rawItem.link);
    const itemDescription = getValidString(rawItem.description);
    const itemPubDate = getValidString(rawItem.pubDate);

    if (
      !itemTitle ||
      !itemLink ||
      !itemDescription ||
      !itemPubDate
    ) {
      continue;
    }

    items.push({
      title: itemTitle,
      link: itemLink,
      description: itemDescription,
      pubDate: itemPubDate,
    });
  }

  return {
    channel: {
      title,
      link,
      description,
      item: items,
    },
  };
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getValidString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return undefined;
  }

  return trimmedValue;
}
