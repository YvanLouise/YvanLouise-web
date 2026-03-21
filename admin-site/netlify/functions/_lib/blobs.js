import { getStore } from "@netlify/blobs";

const STORE_NAME = "yvanlouise-admin-private";

function resolveManualBlobsOptions() {
  const siteID =
    process.env.NETLIFY_BLOBS_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID ||
    "";
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.NETLIFY_ACCESS_TOKEN ||
    "";

  if (!siteID && !token) {
    return undefined;
  }

  if (!siteID || !token) {
    throw new Error(
      "Netlify Blobs manual configuration is incomplete. Set both NETLIFY_BLOBS_SITE_ID and NETLIFY_BLOBS_TOKEN."
    );
  }

  return { siteID, token };
}

function getPrivateStore() {
  try {
    const options = resolveManualBlobsOptions();
    return options ? getStore(STORE_NAME, options) : getStore(STORE_NAME);
  } catch (error) {
    if (error instanceof Error && error.name === "MissingBlobsEnvironmentError") {
      throw new Error(
        "Netlify Blobs is not available in this function runtime yet. Redeploy the admin-site first. If it still fails, add NETLIFY_BLOBS_SITE_ID and NETLIFY_BLOBS_TOKEN to the admin-site environment variables."
      );
    }

    throw error;
  }
}

function createKey(prefix, id) {
  return `${prefix}/${Date.now()}-${id}.json`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function saveMessage(message) {
  const store = getPrivateStore();
  const key = createKey("messages", message.id);
  await store.set(key, JSON.stringify(message), { contentType: "application/json" });
  return key;
}

export async function saveReview(review) {
  const store = getPrivateStore();
  const key = createKey(`reviews/${review.workId}`, review.id);
  await store.set(key, JSON.stringify(review), { contentType: "application/json" });
  return key;
}

async function listByPrefix(prefix) {
  const store = getPrivateStore();
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
