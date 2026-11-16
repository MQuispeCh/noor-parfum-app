// Noor Parfum · Tarjeta Noor en Google Wallet (Supabase Edge Function "wallet")
//
//   GET  /functions/v1/wallet?c=CODIGO          → abre "Guardar en Google Wallet" (redirección)
//   GET  /functions/v1/wallet?c=CODIGO&sync=1   → actualiza la tarjeta ya guardada (sellos, premio)
//
// Secretos (Supabase › Edge Functions › Secrets):
//   GW_ISSUER_ID  número de emisor de la consola de Google Pay & Wallet
//   GW_SA_KEY     contenido completo del archivo JSON de la cuenta de servicio
// Al desplegar, desactiva "Verify JWT": el cliente abre este link desde su tarjeta.

const SITE = "https://mquispech.github.io/noor-parfum-app";
const WA = "51926252995";
const API = "https://walletobjects.googleapis.com/walletobjects/v1";
const CLASS_SUFFIX = "tarjeta_noor";

type Premio = { en: number; premio: string };
type Reglas = { meta?: number; premios?: Premio[] };
type Canje = { ciclo?: number; en?: number; premio?: string; fecha?: string };
type Tarjeta = { nombre?: string; desde?: string; sellos?: number; canjes?: Canje[]; reglas?: Reglas };

// Mismo cálculo que app.js › estadoTarjeta y tarjeta.html › estado
export function estado(G: number, canjes: Canje[] = [], R: Reglas = {}) {
  const meta = +(R.meta ?? 6) || 6;
  const premios = [...(R.premios ?? [])].sort((a, b) => a.en - b.en);
  const k = canjes.filter((c) => +(c.en ?? 0) === meta).length;
  const cur = Math.max(0, G - k * meta), ciclo = k + 1;
  const listos = premios.filter((p) => p.en <= Math.min(cur, meta) && !canjes.some((c) => +(c.ciclo ?? 0) === ciclo && +(c.en ?? 0) === p.en));
  const sig = premios.find((p) => p.en > cur);
  return { meta, premios, ciclo, cur: Math.min(cur, meta), sobra: Math.max(0, cur - meta), listos, sig, faltan: sig ? sig.en - cur : 0 };
}

const b64u = (b: Uint8Array | string) => {
  const bytes = typeof b === "string" ? new TextEncoder().encode(b) : b;
  let s = ""; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function signJwt(payload: Record<string, unknown>, pem: string) {
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const data = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64u(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(data)));
  return data + "." + b64u(sig);
}

let tokenCache: { t: string; exp: number } | null = null;
async function accessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp > now + 60) return tokenCache.t;
  const assertion = await signJwt({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/wallet_object.issuer", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }, sa.private_key);
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!r.ok) throw new Error("token " + r.status + " " + await r.text());
  const j = await r.json();
  tokenCache = { t: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return tokenCache.t;
}

export function buildClass(issuer: string) {
  return {
    id: `${issuer}.${CLASS_SUFFIX}`,
    issuerName: "Noor Parfum",
    programName: "Tarjeta Noor",
    programLogo: { sourceUri: { uri: `${SITE}/wallet/logo-wallet.png` }, contentDescription: { defaultValue: { language: "es-PE", value: "Noor Parfum" } } },
    hexBackgroundColor: "#0B0B0D",
    reviewStatus: "UNDER_REVIEW",
    countryCode: "PE",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
  };
}

export function buildObject(issuer: string, code: string, T: Tarjeta) {
  const e = estado(+(T.sellos ?? 0), T.canjes ?? [], T.reglas ?? {});
  const meta = Math.min(12, Math.max(2, e.meta));
  const link = `${SITE}/tarjeta.html?c=${encodeURIComponent(code)}`;
  const premioTxt = e.listos.length
    ? `¡Premio listo! ${e.listos.map((p) => p.premio).join(" + ")}. Escríbenos y úsalo en tu próxima compra.`
    : e.sig ? `Te ${e.faltan === 1 ? "falta 1 sello" : `faltan ${e.faltan} sellos`} para: ${e.sig.premio}.` : "¡Completaste tu tarjeta!";
  return {
    id: `${issuer}.${code}`,
    classId: `${issuer}.${CLASS_SUFFIX}`,
    state: "ACTIVE",
    accountId: code,
    accountName: T.nombre || "Cliente Noor",
    loyaltyPoints: { label: "Sellos", balance: { string: `${e.cur}/${meta}` } },
    secondaryLoyaltyPoints: { label: "Premios listos", balance: { int: e.listos.length } },
    heroImage: { sourceUri: { uri: `${SITE}/wallet/sellos-${meta}-${e.cur}.png` }, contentDescription: { defaultValue: { language: "es-PE", value: `${e.cur} de ${meta} sellos` } } },
    barcode: { type: "QR_CODE", value: link, alternateText: code },
    textModulesData: [
      { id: "estado", header: e.listos.length ? "Tienes un premio" : "Tu próximo premio", body: premioTxt },
      { id: "reglas", header: "Cómo funciona", body: `Cada perfume o set que compras suma 1 sello. ${e.premios.map((p) => `${p.en} sellos: ${p.premio}`).join(". ")}.` },
    ],
    linksModuleData: { uris: [
      { id: "tarjeta", uri: link, description: "Ver mi tarjeta" },
      { id: "catalogo", uri: `${SITE}/catalogo.html`, description: "Ver el catálogo" },
      { id: "whatsapp", uri: `https://wa.me/${WA}?text=${encodeURIComponent(`Hola Noor Parfum 👋, soy ${T.nombre || ""} (Tarjeta Noor ${code}).`)}`, description: "Escribir por WhatsApp" },
    ] },
  };
}

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const page = (t: string, s = 400) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#0B0B0D;color:#F7F1E6;padding:40px 24px;text-align:center"><h2>Tarjeta Noor</h2><p>${t}</p><p><a style="color:#D4AF7C" href="${SITE}/catalogo.html">Ver el catálogo</a></p>`, { status: s, headers: { "content-type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const code = (url.searchParams.get("c") || "").trim().toUpperCase();
  const sync = url.searchParams.has("sync");
  const issuer = Deno.env.get("GW_ISSUER_ID");
  const saRaw = Deno.env.get("GW_SA_KEY");
  if (!issuer || !saRaw) return sync ? json({ ok: false, error: "wallet_no_configurado" }, 503) : page("Google Wallet todavía no está activado para esta tarjeta.", 503);
  if (!/^[A-Z0-9]{8,20}$/.test(code)) return sync ? json({ ok: false, error: "codigo" }, 400) : page("El link de la tarjeta no está completo.");

  // Datos de la tarjeta con la misma función pública que usa tarjeta.html
  const sbUrl = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const r = await fetch(`${sbUrl}/rest/v1/rpc/tarjeta_publica`, { method: "POST", headers: { apikey: anon, authorization: `Bearer ${anon}`, "content-type": "application/json" }, body: JSON.stringify({ p_codigo: code }) });
  const T: Tarjeta | null = r.ok ? await r.json() : null;
  if (!T) return sync ? json({ ok: false, error: "no_existe" }, 404) : page("No encontramos esta tarjeta.", 404);

  const sa = JSON.parse(saRaw);
  const obj = buildObject(issuer, code, T);
  try {
    const tok = await accessToken(sa);
    const H = { authorization: `Bearer ${tok}`, "content-type": "application/json" };
    const cur = await fetch(`${API}/loyaltyObject/${encodeURIComponent(obj.id)}`, { headers: H });
    if (cur.ok) {
      // Ya la tiene guardada: la actualizamos y, si cambiaron los sellos o hay premio nuevo, Google le avisa
      const old = await cur.json();
      const changed = old?.loyaltyPoints?.balance?.string !== obj.loyaltyPoints.balance.string || (old?.secondaryLoyaltyPoints?.balance?.int ?? 0) !== obj.secondaryLoyaltyPoints.balance.int;
      const up = await fetch(`${API}/loyaltyObject/${encodeURIComponent(obj.id)}`, { method: "PUT", headers: H, body: JSON.stringify({ ...obj, notifyPreference: changed ? "NOTIFY" : "DO_NOT_NOTIFY" }) });
      if (!up.ok) {
        const txt = await up.text();
        // Si se pasó el límite de avisos del día, se actualiza igual sin avisar
        if (changed && /quota/i.test(txt)) await fetch(`${API}/loyaltyObject/${encodeURIComponent(obj.id)}`, { method: "PUT", headers: H, body: JSON.stringify({ ...obj, notifyPreference: "DO_NOT_NOTIFY" }) });
        else console.error("update", up.status, txt);
      }
      if (sync) return json({ ok: true, guardada: true, notificada: changed });
    } else if (sync) {
      return json({ ok: true, guardada: false });
    }
  } catch (err) {
    console.error(err);
    if (sync) return json({ ok: false, error: "google" }, 502);
  }

  // Link "Guardar en Google Wallet": crea el programa y la tarjeta si aún no existen
  const jwt = await signJwt({
    iss: sa.client_email, aud: "google", typ: "savetowallet", iat: Math.floor(Date.now() / 1000),
    origins: [SITE.replace(/\/noor-parfum-app$/, "")],
    payload: { loyaltyClasses: [buildClass(issuer)], loyaltyObjects: [obj] },
  }, sa.private_key);
  return new Response(null, { status: 302, headers: { location: `https://pay.google.com/gp/v/save/${jwt}` } });
});
