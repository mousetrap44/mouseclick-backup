export default async function handler(req, res) {
  try {
    const sourceUrl =
      "https://raw.githubusercontent.com/djdoolky76/Mediaquest-EPG/main/cignal_epg.xml";

    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mouseclick-FreeTV-EPG" }
    });

    if (!response.ok) {
      return res.status(500).send("Failed to fetch EPG source");
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

    // Copy source channel programmes to Mouseclick tvg-id
    for (const [targetId, sourceId] of Object.entries(mappings)) {
      if (!xml.includes(`channel id="${targetId}"`)) {
        xml = xml.replace(
          "</tv>",
          `<channel id="${targetId}"><display-name>${targetId}</display-name></channel>\n</tv>`
        );
      }

      const regex = new RegExp(
        `<programme([^>]*?)channel="${sourceId}"([^>]*?)>([\\s\\S]*?)<\\/programme>`,
        "g"
      );

      let extra = "";
      let match;

      while ((match = regex.exec(xml)) !== null) {
        extra += `<programme${match[1]}channel="${targetId}"${match[2]}>${match[3]}</programme>\n`;
      }

      xml = xml.replace("</tv>", extra + "</tv>");
    }

    // Rolling date fix: shift old EPG dates to today's PH date
    const now = new Date();
    const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));

    const yyyy = phNow.getFullYear().toString();
    const mm = String(phNow.getMonth() + 1).padStart(2, "0");
    const dd = String(phNow.getDate()).padStart(2, "0");
    const today = `${yyyy}${mm}${dd}`;

    xml = xml.replace(
      /(start|stop)="(\d{8})(\d{6}) \+0800"/g,
      (full, attr, oldDate, time) => {
        return `${attr}="${today}${time} +0800"`;
      }
    );

    if (req.query.channels === "1") {
      const ids = [...xml.matchAll(/<channel id="([^"]+)"/g)].map(m => m[1]);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(ids.join("\n"));
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");

    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).send("EPG Error: " + error.message);
  }
}
