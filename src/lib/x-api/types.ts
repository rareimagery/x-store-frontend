// ---------------------------------------------------------------------------
// X API v2 TypeScript Types — per x-api-integration.md spec
// ---------------------------------------------------------------------------

export interface XUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  profile_banner_url?: string;
  verified_type?: "blue" | "business" | "government" | "none";
  location?: string;
  created_at?: string;
  url?: string;
  pinned_tweet_id?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
    like_count: number;
  };
  entities?: {
    url?: {
      urls: Array<{ url: string; expanded_url: string; display_url: string }>;
    };
    description?: {
      urls?: Array<{ url: string; expanded_url: string }>;
    };
  };
}

export interface XPost {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count: number;
    bookmark_count: number;
  };
  attachments?: { media_keys?: string[] };
  referenced_tweets?: Array<{
    type: "replied_to" | "retweeted" | "quoted";
    id: string;
  }>;
  entities?: {
    urls?: Array<{
      url: string;
      expanded_url: string;
      display_url: string;
      images?: Array<{ url: string; width: number; height: number }>;
    }>;
    hashtags?: Array<{ start: number; end: number; tag: string }>;
    mentions?: Array<{
      start: number;
      end: number;
      username: string;
      id: string;
    }>;
  };
}

export interface XMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
  alt_text?: string;
}

export interface XUserResponse {
  data: XUser;
  includes?: { tweets?: XPost[] };
  errors?: XApiErrorObject[];
}

export interface XUsersResponse {
  data: XUser[];
  errors?: XApiErrorObject[];
}

export interface XTimelineResponse {
  data: XPost[];
  includes?: { media?: XMedia[]; tweets?: XPost[] };
  meta: {
    newest_id: string;
    oldest_id: string;
    result_count: number;
    next_token?: string;
  };
  errors?: XApiErrorObject[];
}

export interface XPostResponse {
  data: XPost;
  includes?: { users?: XUser[]; media?: XMedia[] };
  errors?: XApiErrorObject[];
}

export interface XApiErrorObject {
  title: string;
  detail: string;
  type: string;
  parameter?: string;
  value?: string;
}

// ---------------------------------------------------------------------------
// Webhook Types — Account Activity API (AAA) event payloads
// ---------------------------------------------------------------------------

export interface XWebhookEvent {
  for_user_id: string;
  tweet_create_events?: XWebhookPost[];
  tweet_delete_events?: Array<{
    status: { id: string; user_id: string };
    timestamp_ms: string;
  }>;
  favorite_events?: Array<{
    id: string;
    created_at: string;
    timestamp_ms: string;
    favorited_status: XWebhookPost;
    user: XWebhookUser;
  }>;
  user_event?: {
    user_fields_update?: Partial<XUser>;
  };
}

export interface XWebhookPost {
  id_str: string;
  text: string;
  created_at: string;
  user: XWebhookUser;
  retweeted_status?: XWebhookPost;
  in_reply_to_user_id_str?: string;
  in_reply_to_status_id_str?: string;
  extended_tweet?: { full_text: string };
}

export interface XWebhookUser {
  id_str: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
  followers_count: number;
  verified: boolean;
}
