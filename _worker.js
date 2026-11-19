const schema = `CREATE TABLE IF NOT EXISTS floats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  design INTEGER NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  created INTEGER NOT NULL
)`;
let ready;

function reply(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function publish(request, db) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return reply({}, 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) return reply({}, 415);
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 160 || !Number.isInteger(body.design) ||
      body.design < 0 || body.design > 6 || !/^[a-f0-9-]{36}$/i.test(body.token ?? "")) {
    return reply({}, 400);
  }
  const now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(Math.floor(now / 86400) + ":" + ip));
  const source = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
  const saved = await db.prepare(`INSERT INTO floats(token,design,message,source,created)
    SELECT ?,?,?,?,? WHERE NOT EXISTS
    (SELECT 1 FROM floats WHERE source=? AND created>? LIMIT 1 OFFSET 19)
    ON CONFLICT(token) DO NOTHING`).bind(body.token, body.design, message, source, now, source, now - 5).run();
  if (!saved.meta.changes && !await db.prepare("SELECT id FROM floats WHERE token=?").bind(body.token).first()) {
    return reply({}, 429);
  }
  return reply({ published: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/floats") return env.ASSETS.fetch(request);
    if (!env.DB) return reply({ error: "database_unavailable" }, 503);
    try {
      ready ??= env.DB.batch([env.DB.prepare(schema), env.DB.prepare(
        "CREATE INDEX IF NOT EXISTS floats_source_created ON floats(source,created)"
      )]).catch(error => { ready = undefined; throw error; });
      await ready;
      if (request.method === "POST") return await publish(request, env.DB);
      if (request.method !== "GET") return reply({}, 405);
      const after = url.searchParams.get("after");
      const fields = "SELECT id, token, design, message FROM floats";
      if (after !== null && !/^\d{1,15}$/.test(after)) return reply({}, 400);
      const query = after === null
        ? env.DB.prepare(fields + " ORDER BY id DESC LIMIT 6")
        : env.DB.prepare(fields + " WHERE id>? ORDER BY id LIMIT 8").bind(Number(after));
      const { results } = await query.all();
      return reply({ floats: after === null ? results.reverse() : results });
    } catch {
      return reply({ error: "database_unavailable" }, 503);
    }
  }
};
