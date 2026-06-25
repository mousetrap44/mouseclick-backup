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

    const xml = await response.text();

    if (req.query.channels === "1") {
      const ids = [...xml.matchAll(/<channel id="([^"]+)"/g)].map(m => m[1]);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(ids.join("\n"));
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900");
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).send("EPG Error: " + error.message);
  }
}
