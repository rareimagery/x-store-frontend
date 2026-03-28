import { X_API_BASE } from "@/lib/x-api/client";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";

type SearchTweet = {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
  };
};

type SearchUser = {
  id: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
  verified_type?: string;
};

export type ConversationItem = {
  id: string;
  text: string;
  createdAt: string | null;
  conversationId: string;
  url: string;
  metrics: {
    likes: number;
    reposts: number;
    replies: number;
  };
  author: {
    id: string;
    name: string;
    username: string;
    profileImageUrl: string | null;
    verifiedType: string;
  };
};

export function normalizeHandle(value: string | null | undefined): string {
  return (value || "").trim().replace(/^@+/, "").toLowerCase();
}

export function getRareProjectHandle(): string {
  return normalizeHandle(
    process.env.RAREPROJECT_X_USERNAME ||
      process.env.NEXT_PUBLIC_RAREPROJECT_X_USERNAME ||
      "rareproject"
  );
}

function buildConversationQuery(myHandle: string, targetHandle: string): string {
  return [
    `(from:${myHandle} @${targetHandle})`,
    `(from:${targetHandle} @${myHandle})`,
    `(to:${targetHandle} from:${myHandle})`,
    `(to:${myHandle} from:${targetHandle})`,
  ].join(" OR ") + " -is:retweet";
}

function mapConversationItems(
  tweets: SearchTweet[],
  users: SearchUser[]
): ConversationItem[] {
  const usersById = new Map(users.map((user) => [user.id, user]));

  return tweets
    .map((tweet) => {
      const author = tweet.author_id ? usersById.get(tweet.author_id) : null;
      return {
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at || null,
        conversationId: tweet.conversation_id || tweet.id,
        url: `https://x.com/${author?.username || "i"}/status/${tweet.id}`,
        metrics: {
          likes: tweet.public_metrics?.like_count ?? 0,
          reposts: tweet.public_metrics?.retweet_count ?? 0,
          replies: tweet.public_metrics?.reply_count ?? 0,
        },
        author: {
          id: author?.id || tweet.author_id || "",
          name: author?.name || author?.username || "Unknown",
          username: author?.username || "unknown",
          profileImageUrl: author?.profile_image_url || null,
          verifiedType: author?.verified_type || "none",
        },
      };
    })
    .sort((left, right) => {
      const leftTs = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTs = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTs - leftTs;
    });
}

export async function searchConversations(
  myHandle: string,
  targetHandle: string,
  headers: Record<string, string>,
  maxResults = 20
): Promise<ConversationItem[]> {
  const normalizedMe = normalizeHandle(myHandle);
  const normalizedTarget = normalizeHandle(targetHandle);

  if (!normalizedMe || !normalizedTarget) {
    return [];
  }

  const params = new URLSearchParams({
    query: buildConversationQuery(normalizedMe, normalizedTarget),
    max_results: String(Math.min(maxResults, 20)),
    expansions: "author_id,in_reply_to_user_id",
    "tweet.fields": [
      "id",
      "text",
      "created_at",
      "author_id",
      "conversation_id",
      "in_reply_to_user_id",
      "public_metrics",
    ].join(","),
    "user.fields": "id,name,username,profile_image_url,verified_type",
  });

  const res = await fetchWithRetry(
    `${X_API_BASE}/tweets/search/recent?${params}`,
    { headers, cache: "no-store" }
  );

  if (!res.ok) {
    const details = await res.text();
    throw new Error(
      `X conversation search failed (${res.status}): ${details.slice(0, 200)}`
    );
  }

  const json = await res.json();
  const tweets = (json.data ?? []) as SearchTweet[];
  const users = (json.includes?.users ?? []) as SearchUser[];

  return mapConversationItems(tweets, users);
}