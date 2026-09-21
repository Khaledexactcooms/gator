import { and, eq } from "drizzle-orm";
import { db } from "../index.js";
import { feedFollows, feeds, users } from "../schema.js";

export async function createFeedFollow(
  userId: string,
  feedId: string,
) {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({ userId, feedId })
    .returning();

  if (!newFeedFollow) {
    throw new Error("Failed to create feed follow");
  }

  const [result] = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(
      and(
        eq(feedFollows.userId, userId),
        eq(feedFollows.feedId, feedId),
      ),
    )
    .limit(1);

  if (!result) {
    throw new Error("Failed to retrieve feed follow");
  }

  return result;
}

export async function getFeedFollowsForUser(userId: string) {
  return await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(eq(feedFollows.userId, userId));
}

export async function deleteFeedFollow(
  userId: string,
  feedUrl: string,
) {
  const [feed] = await db
    .select({
      id: feeds.id,
      name: feeds.name,
    })
    .from(feeds)
    .where(eq(feeds.url, feedUrl))
    .limit(1);

  if (!feed) {
    throw new Error(`Feed with URL ${feedUrl} does not exist`);
  }

  const [deletedFollow] = await db
    .delete(feedFollows)
    .where(
      and(
        eq(feedFollows.userId, userId),
        eq(feedFollows.feedId, feed.id),
      ),
    )
    .returning();

  if (!deletedFollow) {
    throw new Error(`You are not following ${feedUrl}`);
  }

  return deletedFollow;
}
