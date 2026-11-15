import { Schema } from "effect";

const Post = Schema.Struct({
  authorId: Schema.String,
  authorName: Schema.String,
  content: Schema.String,
  contentUrl: Schema.String,
  images: Schema.Array(Schema.String),
  createdAt: Schema.String,
  type: Schema.Finite,
  isSelf: Schema.Boolean,
});

const Posts = Schema.Struct({
  logs: Schema.Array(Post),
  meta: Schema.Struct({ page: Schema.Finite, maxPage: Schema.Finite }),
});

export const PostsJson = Schema.fromJsonString(Posts);

export type TwilogPosts = typeof Posts.Type;
