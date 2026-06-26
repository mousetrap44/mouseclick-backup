// Save this file in your Vercel project as: api/epg-now.js
// Then set Supabase epg_url to: https://mouseclick-backup-peach.vercel.app/api/epg-now?v=1

export default async function handler(req, res) {
  try {
    const sourceUrl = "https://raw.githubusercontent.com/djdoolky76/Mediaquest-EPG/main/cignal_epg.xml";
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mouseclick-FreeTV-EPG-Now" }
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch EPG source" });
    }

    let xml = await response.text();

    const mappings = {
      "tv5.ph": "tv5",
      "rptv.ph": "cnn_rptv_prod_hd",
      "a2z.ph": "cg_a2z",
      "ptv4.ph": "cg_ptv4_sd",
      "onesports.ph": "cg_onesports_hd",
      "onesportsplus.ph": "cg_onesportsplus_hd1",
      "onenews.ph": "onenews_hd1",
      "oneph.ph": "oneph_sd",
      "kapatid.ph": "kapatid_hd",
      "ibc13.ph": "ibc13_sd_new",
      "tvmaria.ph": "tvmaria_prd",
      "buko.ph": "buko",
      "knowledge.ph": "knowledge_channel"
    };

    const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const today = ymd(phNow);
    const tomorrowDate = new Date(phNow);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = ymd(tomorrowDate);

    // Roll source dates to current PH date so delayed source files still produce NOW/NEXT.
    xml = xml.replace(
      /<programme([^>]*?)start="(\d{8})(\d{6}) \+0800"([^>]*?)stop="(\d{8})(\d{6}) \+0800"([^>]*?)>/g,
      (full, beforeStart, oldStartDate, startTime, mid, oldStopDate, stopTime, afterStop) => {
        const stopDate = stopTime <= startTime ? tomorrow : today;
        return `<programme${beforeStart}start="${today}${startTime} +0800"${mid}stop="${stopDate}${stopTime} +0800"${afterStop}>`;
      }
    );

    const nowMs = Date.now();
    const out = {};

    for (const [targetId, sourceId] of Object.entries(mappings)) {
      const programmes = extractProgrammes(xml, sourceId)
        .map(p => ({ ...p, channelId: targetId }))
        .filter(p => p.startMillis && p.endMillis && p.endMillis > p.startMillis)
        .sort((a, b) => a.startMillis - b.startMillis);

      const now = programmes.find(p => nowMs >= p.startMillis && nowMs < p.endMillis) || null;
      const next = programmes.find(p => p.startMillis > nowMs) || null;

      if (now || next) {
        out[targetId] = { now, next };
      }
    }

    if (req.query.debug === "1") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(Object.keys(out).map(id => {
        const item = out[id];
        return `${id}\nNOW: ${item.now ? item.now.title + " " + item.now.start + "-" + item.now.end : "--"}\nNEXT: ${item.next ? item.next.title + " " + item.next.start : "--"}`;
      }).join("\n\n"));
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      type: "mouseclick_epg_now",
      generatedAt: new Date().toISOString(),
      timezone: "Asia/Manila",
      channels: out
    });
  } catch (error) {
    return res.status(500).json({ error: "EPG Error: " + error.message });
  }
}

function ymd(date) {
  return String(date.getFullYear()) +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
}

function extractProgrammes(xml, channelId) {
  const list = [];
  const re = new RegExp(`<programme([^>]*?)channel="${escapeRegExp(channelId)}"([^>]*?)>([\\s\\S]*?)<\\/programme>`, "g");
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = `${m[1]} ${m[2]}`;
    const body = m[3] || "";
    const start = attr(attrs, "start");
    const stop = attr(attrs, "stop");
    const title = tagText(body, "title") || "Program";
    const desc = tagText(body, "desc") || null;
    const startMillis = parseXmlTv(start);
    const endMillis = parseXmlTv(stop);
    list.push({
      title: cleanTitle(title),
      desc,
      startMillis,
      endMillis,
      start: displayTime(startMillis),
      end: displayTime(endMillis)
    });
  }
  return list;
}

function cleanTitle(title) {
  const t = decodeXml(title).trim();
  if (!t || /^to be announced$/i.test(t) || /^tba$/i.test(t)) return "To Be Announced";
  return t;
}

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`${name}="([^"]+)"`));
  return m ? m[1] : "";
}

function tagText(body, tag) {
  const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decodeXml(m[1]) : "";
}

function parseXmlTv(value) {
  const m = String(value || "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-])(\d{2})(\d{2})$/);
  if (!m) return 0;
  const [, y, mo, d, h, mi, s, sign, oh, om] = m;
  const offsetMinutes = (parseInt(oh, 10) * 60 + parseInt(om, 10)) * (sign === "+" ? 1 : -1);
  return Date.UTC(parseInt(y,10), parseInt(mo,10)-1, parseInt(d,10), parseInt(h,10), parseInt(mi,10), parseInt(s,10)) - offsetMinutes * 60 * 1000;
}

function displayTime(ms) {
  if (!ms) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(ms));
}

function decodeXml(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
