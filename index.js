// TikTok Tools API — calculators from elev8or.io + gifter levels from tik.tools.
// Zero dependencies (Node built-in http). Botkeep-ready:
// listens on 0.0.0.0, port from SERVER_PORT (falls back to PORT, then 3000).
// Optional auth: set env API_KEY -> clients must send header x-api-key.
// Rates are US estimates (2026) and are labeled as estimates in responses.

import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "";

const GIFTER_LEVELS = JSON.parse(
  readFileSync(new URL("./gifter-levels.json", import.meta.url), "utf8")
);

// --- Rate constants (US, 2026 estimates) ---
const COIN_WEB_USD = 0.01036; // tiktok.com/coin recharge, ~700 coins = $7.25
const COIN_APP_USD = 0.0133; // in-app purchase, ~700 coins = $9.31
const DIAMOND_USD = 0.005; // 1 diamond paid out to creator
const CREATOR_PER_COIN_USD = 0.005; // creator receives ~$0.005 per gifted coin
const REWARDS_RPM_LOW = 0.2; // Creator Rewards $ per 1000 qualified views
const REWARDS_RPM_HIGH = 1.0;

const j = (res, obj, status = 200) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(obj, null, 2));
};
const num = (q, name, def = NaN) => {
  const v = parseFloat(q.get(name));
  return Number.isFinite(v) ? v : def;
};
const round2 = (n) => Math.round(n * 100) / 100;

const ENDPOINTS = [
  { path: "/health", desc: "API status check" },
  { path: "/coins?amount=1000", desc: "Coins to USD: web cost, app cost, creator payout" },
  { path: "/diamonds?amount=10000", desc: "Diamonds to USD payout value" },
  { path: "/gifter-levels", desc: "Full gifter level table L1-L50 (coins + USD thresholds)" },
  { path: "/gifter-level?coins=144000", desc: "Gifter level for a lifetime coin amount + progress to next" },
  { path: "/money?monthly_views=1000000", desc: "Monthly earnings estimate (Creator Rewards range)" },
  { path: "/creator-rewards?monthly_views=1000000", desc: "Creator Rewards payout estimate" },
  { path: "/shop-commission?price=20&rate=10&sales=100", desc: "TikTok Shop affiliate commission earnings" },
  { path: "/engagement?views=100000&likes=8000&comments=300&shares=200", desc: "Engagement rate %" },
  { path: "/pricing?followers=100000&avg_views=50000", desc: "Suggested sponsored post price range (estimate)" },
  { path: "/username-ideas?word=fitness", desc: "TikTok username ideas from a keyword" },
  { path: "/follower-count?username=tiktok", desc: "Live follower/following/video counts for any public account" },
  { path: "/average-views?username=tiktok", desc: "Average views/likes over the account's recent videos" },
];

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const q = url.searchParams;

  if (p === "/") return j(res, { code: 0, msg: "tiktok-tools-api OK", endpoints: ENDPOINTS });
  if (p === "/health") return j(res, { code: 0, status: "ok", time: new Date().toISOString() });

  if (API_KEY && req.headers["x-api-key"] !== API_KEY)
    return j(res, { code: 10401, msg: "missing or invalid api key" }, 401);

  try {
    // ---- elev8or: TikTok Coin Calculator ----
    if (p === "/coins") {
      const amount = num(q, "amount");
      if (!(amount > 0)) return j(res, { code: -1, msg: "amount required (coins)" }, 400);
      const web = round2(amount * COIN_WEB_USD);
      const app = round2(amount * COIN_APP_USD);
      const creator = round2(amount * CREATOR_PER_COIN_USD);
      return j(res, {
        code: 0,
        coins: amount,
        web_cost_usd: web,
        app_cost_usd: app,
        diamonds_for_creator: amount,
        creator_payout_usd: creator,
        platform_keeps_usd: round2(app - creator),
        note: "US estimates (2026). Web recharge is ~25% cheaper than in-app.",
      });
    }

    // ---- elev8or: TikTok Diamonds to USD Calculator ----
    if (p === "/diamonds") {
      const amount = num(q, "amount");
      if (!(amount > 0)) return j(res, { code: -1, msg: "amount required (diamonds)" }, 400);
      return j(res, {
        code: 0,
        diamonds: amount,
        usd: round2(amount * DIAMOND_USD),
        note: "Estimate at $0.005 per diamond, before withdrawal fees/taxes.",
      });
    }

    // ---- tik.tools: Gifter Levels (full table) ----
    if (p === "/gifter-levels") return j(res, { code: 0, total: GIFTER_LEVELS.length, levels: GIFTER_LEVELS });

    // ---- tik.tools: Gifter level from lifetime coins ----
    if (p === "/gifter-level") {
      const coins = num(q, "coins");
      if (!(coins >= 0)) return j(res, { code: -1, msg: "coins required (lifetime coins gifted)" }, 400);
      let current = null, next = null;
      for (const l of GIFTER_LEVELS) {
        if (coins >= l.coins) current = l;
        else { next = l; break; }
      }
      if (!current)
        return j(res, { code: 0, coins, level: 0, name: "No level yet", next_level: GIFTER_LEVELS[0], coins_to_next: GIFTER_LEVELS[0].coins - coins });
      const out = { code: 0, coins, level: current.level, name: current.name, perks: current.perks, usd_spent_approx: current.usd };
      if (next) {
        out.next_level = next.level;
        out.next_name = next.name;
        out.coins_to_next = next.coins - coins;
        out.progress_pct = round2(((coins - current.coins) / (next.coins - current.coins)) * 100);
      } else out.max_level = true;
      return j(res, out);
    }

    // ---- elev8or: TikTok Money / Creator Rewards Calculator ----
    if (p === "/money" || p === "/creator-rewards") {
      const views = num(q, "monthly_views");
      if (!(views > 0)) return j(res, { code: -1, msg: "monthly_views required" }, 400);
      const low = round2((views / 1000) * REWARDS_RPM_LOW);
      const high = round2((views / 1000) * REWARDS_RPM_HIGH);
      return j(res, {
        code: 0,
        monthly_views: views,
        creator_rewards_usd: { low, high },
        note: "Creator Rewards only: qualified views on 1min+ original videos. Real RPM varies by niche/country. Brand deals not included.",
      });
    }

    // ---- elev8or: TikTok Shop Commission Calculator ----
    if (p === "/shop-commission") {
      const price = num(q, "price");
      const rate = num(q, "rate");
      const sales = num(q, "sales", 1);
      if (!(price > 0) || !(rate > 0)) return j(res, { code: -1, msg: "price and rate (%) required" }, 400);
      const perSale = round2((price * rate) / 100);
      return j(res, {
        code: 0,
        product_price_usd: price,
        commission_rate_pct: rate,
        sales,
        commission_per_sale_usd: perSale,
        total_commission_usd: round2(perSale * sales),
      });
    }

    // ---- elev8or: TikTok Engagement Rate Calculator ----
    if (p === "/engagement") {
      const views = num(q, "views");
      const likes = num(q, "likes", 0), comments = num(q, "comments", 0), shares = num(q, "shares", 0);
      if (!(views > 0)) return j(res, { code: -1, msg: "views required" }, 400);
      const rate = round2(((likes + comments + shares) / views) * 100);
      return j(res, {
        code: 0,
        views, likes, comments, shares,
        engagement_rate_pct: rate,
        label: rate >= 10 ? "excellent" : rate >= 5 ? "good" : rate >= 3 ? "average" : rate >= 1 ? "low" : "very low",
        note: "Benchmarks vary by follower tier and niche.",
      });
    }

    // ---- elev8or: TikTok Influencer Pricing Calculator (estimate model) ----
    if (p === "/pricing") {
      const avgViews = num(q, "avg_views");
      const followers = num(q, "followers", 0);
      if (!(avgViews > 0)) return j(res, { code: -1, msg: "avg_views required" }, 400);
      // Common market model: $0.01-$0.03 per average view for a sponsored post.
      return j(res, {
        code: 0,
        followers,
        avg_views: avgViews,
        sponsored_post_usd: { low: round2(avgViews * 0.01), high: round2(avgViews * 0.03) },
        note: "Rough market estimate. Niche, country, engagement and usage rights change real prices a lot.",
      });
    }

    // ---- elev8or: TikTok Username Generator ----
    if (p === "/username-ideas") {
      const word = (q.get("word") || "").replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
      if (word.length < 2) return j(res, { code: -1, msg: "word required (min 2 chars)" }, 400);
      const pre = ["the", "its", "real", "mr", "ms", "hey", "get", "try", "go", "my"];
      const suf = ["hub", "lab", "hq", "daily", "zone", "club", "official", "tv", "now", "pro", "world", "life"];
      const ideas = new Set();
      for (const s of suf) ideas.add(word + s), ideas.add(word + "." + s), ideas.add(word + "_" + s);
      for (const s of pre) ideas.add(s + word), ideas.add(s + "." + word);
      ideas.add(word + "s"), ideas.add(word + ".official");
      const list = [...ideas].filter((u) => u.length >= 2 && u.length <= 24);
      return j(res, { code: 0, word, count: list.length, ideas: list, note: "Ideas only — availability is not checked." });
    }

    // ---- elev8or: TikTok Follower Count (live data via tikwm) ----
    if (p === "/follower-count" || p === "/average-views") {
      const username = (q.get("username") || "").replace(/^@/, "").trim();
      if (!username) return j(res, { code: -1, msg: "username required" }, 400);
      const ua = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };
      if (p === "/follower-count") {
        const r = await fetch(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`, { headers: ua });
        const d = await r.json().catch(() => null);
        const u = d && d.data && d.data.user, s = d && d.data && d.data.stats;
        if (!u) return j(res, { code: -1, msg: "user not found or source unavailable" }, 502);
        return j(res, {
          code: 0, username: u.uniqueId, nickname: u.nickname, verified: !!u.verified,
          private_account: !!u.privateAccount, signature: u.signature || "",
          followers: s.followerCount, following: s.followingCount,
          videos: s.videoCount, likes: s.heartCount,
        });
      }
      const r = await fetch(`https://www.tikwm.com/api/user/posts?unique_id=${encodeURIComponent(username)}&count=30`, { headers: ua });
      const d = await r.json().catch(() => null);
      const vids = d && d.data && Array.isArray(d.data.videos) ? d.data.videos : null;
      if (!vids || !vids.length) return j(res, { code: -1, msg: "no public videos found or source unavailable" }, 502);
      const n = vids.length;
      const sum = (f) => vids.reduce((a, v) => a + (f(v) || 0), 0);
      return j(res, {
        code: 0, username,
        videos_checked: n,
        avg_views: Math.round(sum((v) => v.play_count) / n),
        avg_likes: Math.round(sum((v) => v.digg_count) / n),
        avg_comments: Math.round(sum((v) => v.comment_count) / n),
        avg_shares: Math.round(sum((v) => v.share_count) / n),
        total_views: sum((v) => v.play_count),
      });
    }

    return j(res, { code: -1, msg: "not found" }, 404);
  } catch (e) {
    return j(res, { code: -1, msg: String(e.message || e) }, 500);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`tiktok-tools-api listening on 0.0.0.0:${PORT}`);
});
