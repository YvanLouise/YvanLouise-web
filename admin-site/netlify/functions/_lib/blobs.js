import { getStore } from "@netlify/blobs";

const store = getStore("yvanlouise-admin-private");

function createKey(prefix, id) {
  return `${prefix}/${Date.now()}-${id}.json`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function saveMessage(message) {
  const key = createKey("messages", message.id);
  await store.set(key, JSON.stringify(message), { contentType: "application/json" });
  return key;
}

export async function saveReview(review) {
  const key = createKey(`reviews/${review.workId}`, review.id);
  await store.set(key, JSON.stringify(review), { contentType: "application/json" });
  return key;
}

async function listByPrefix(prefix) {
  const items = [];
  let cursor = undefined;

  do {
    const page = await store.list({ prefix, cursor });
    const blobs = page.blobs || [];

    for (const blob of blobs) {
      const item = await store.get(blob.key, { type: "json" });
      if (item) {
        items.push(item);
      }
    }

    cursor = page.cursor || undefined;
  } while (cursor);

  return items;
}

export async function listMessages() {
  const messages = await listByPrefix("messages/");
  return clone(messages).sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

export async function listReviews() {
  const reviews = await listByPrefix("reviews/");
  return clone(reviews).sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

