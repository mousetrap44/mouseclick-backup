export default async function handler(req, res) {
  try {
    const sourceUrl = "https://raw.githubusercontent.com/djdoolky76/Mediaquest-EPG/main/cignal_epg.xml";
    let xml = await (await fetch(sourceUrl, { headers: { "User-Agent": "Mouseclick-FreeTV-EPG" } })).text();

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

    // Roll EPG dates to today PH time
    const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const today =
      phNow.getFullYear().toString() +
      String(phNow.getMonth() + 1).padStart(2, "0") +
      String(phNow.getDate()).padStart(2, "0");

    xml = xml.replace(/(start|stop)="\d{8}(\d{6}) \+0800"/g, `$1="${today}$2 +0800"`);

    // Copy source programmes to Mouseclick IDs
    let additions = "";

    for (const [targetId, sourceId] of Object.entries(mappings)) {
      additions += `<channel id="${targetId}"><display-name>${targetId}</display-name></channel>\n`;

      const re = new RegExp(`<programme([^>]*?)channel="${sourceId}"([^>]*?)>([\\s\\S]*?)<\\/programme>`, "g");
      let m;
      while ((m = re.exec(xml)) !== null) {
        additions += `<programme${m[1]}channel="${targetId}"${m[2]}>${m[3]}</programme>\n`;
      }
    }

    xml = xml.replace("</tv>", additions + "</tv>");

    if (req.query.channels === "1") {
      const ids = [...xml.matchAll(/<channel id="([^"]+)"/g)].map(x => x[1]);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(ids.join("\n"));
    }

    if (req.query.find) {
      const id = req.query.find;
      const list = [...xml.matchAll(new RegExp(`<programme[^>]*channel="${id}"[^>]*>[\\s\\S]*?<\\/programme>`, "g"))]
        .slice(0, 10)
        .map(x => x[0]);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(list.join("\n\n"));
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(xml);

  } catch (e) {
    return res.status(500).send("EPG Error: " + e.message);
  }
}
