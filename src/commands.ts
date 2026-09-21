import {
  formatDuration,
  parseDuration,
  scrapeFeeds,
} from "./agg.js";
import { readConfig, setUser } from "./config.js";
import {
  createFeedFollow,
  deleteFeedFollow,
  getFeedFollowsForUser,
} from "./lib/db/queries/feedFollows.js";
import {
  createFeed,
  getFeedByUrl,
  getFeeds,
} from "./lib/db/queries/feeds.js";
import { getPostsForUser } from "./lib/db/queries/posts.js";
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from "./lib/db/queries/users.js";
import type { Feed, User } from "./lib/db/schema.js";

export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

export function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (
    cmdName: string,
    ...args: string[]
  ): Promise<void> => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("No user is currently logged in");
    }

    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error(`User ${config.currentUserName} not found`);
    }

    await handler(cmdName, user, ...args);
  };
}

export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(`Usage: ${cmdName} <username>`);
  }

  const username = args[0];
  const user = await getUserByName(username);

  if (!user) {
    throw new Error(`User ${username} does not exist`);
  }

  setUser(username);
  console.log(`User has been set to ${username}`);
}

export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(`Usage: ${cmdName} <username>`);
  }

  const username = args[0];
  const existingUser = await getUserByName(username);

  if (existingUser) {
    throw new Error(`User ${username} already exists`);
  }

  const user = await createUser(username);

  setUser(username);

  console.log(`User ${username} created successfully`);
  console.log(user);
}

export async function handlerReset(): Promise<void> {
  await deleteAllUsers();
  console.log("Database reset successfully");
}

export async function handlerUsers(): Promise<void> {
  const config = readConfig();
  const allUsers = await getUsers();

  for (const user of allUsers) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

export async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length !== 1) {
    throw new Error(`Usage: ${cmdName} <time_between_reqs>`);
  }

  const timeBetweenRequests = parseDuration(args[0]);

  console.log(
    `Collecting feeds every ${formatDuration(timeBetweenRequests)}`,
  );

  const handleError = (error: unknown): void => {
    if (error instanceof Error) {
      console.error(`Error fetching feed: ${error.message}`);
    } else {
      console.error(
        "An unknown error occurred while fetching a feed",
      );
    }
  };

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("\nShutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error(`Usage: ${cmdName} <name> <url>`);
  }

  const feedName = args[0];
  const feedUrl = args[1];

  const feed = await createFeed(feedName, feedUrl, user.id);
  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log("Feed created successfully");
  printFeed(feed, user);

  console.log(
    `${feedFollow.userName} is now following ${feedFollow.feedName}`,
  );
}

export async function handlerFeeds(): Promise<void> {
  const allFeeds = await getFeeds();

  for (const result of allFeeds) {
    printFeed(result.feed, result.user);
    console.log("---");
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error(`Usage: ${cmdName} <url>`);
  }

  const feedUrl = args[0];
  const feed = await getFeedByUrl(feedUrl);

  if (!feed) {
    throw new Error(`Feed with URL ${feedUrl} does not exist`);
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(
    `${feedFollow.userName} is now following ${feedFollow.feedName}`,
  );
}

export async function handlerFollowing(
  _cmdName: string,
  user: User,
): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(`* ${follow.feedName}`);
  }
}

export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error(`Usage: ${cmdName} <url>`);
  }

  const feedUrl = args[0];

  await deleteFeedFollow(user.id, feedUrl);

  console.log(`${user.name} unfollowed ${feedUrl}`);
}

export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length > 1) {
    throw new Error(`Usage: ${cmdName} [limit]`);
  }

  let limit = 2;

  if (args.length === 1) {
    if (!/^\d+$/.test(args[0])) {
      throw new Error("Limit must be a positive integer");
    }

    limit = Number.parseInt(args[0], 10);

    if (limit <= 0) {
      throw new Error("Limit must be greater than zero");
    }
  }

  const userPosts = await getPostsForUser(user.id, limit);

  if (userPosts.length === 0) {
    console.log("No posts found");
    return;
  }

  for (const post of userPosts) {
    console.log(`Title: ${post.title}`);
    console.log(`Feed: ${post.feedName}`);
    console.log(`URL: ${post.url}`);
    console.log(
      `Published: ${
        post.publishedAt?.toISOString() ?? "Unknown"
      }`,
    );

    if (post.description) {
      console.log(`Description: ${post.description}`);
    }

    console.log("---");
  }
}

export function printFeed(feed: Feed, user: User): void {
  console.log(`Feed ID: ${feed.id}`);
  console.log(`Created At: ${feed.createdAt}`);
  console.log(`Updated At: ${feed.updatedAt}`);
  console.log(`Name: ${feed.name}`);
  console.log(`URL: ${feed.url}`);
  console.log(`User: ${user.name}`);
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}
