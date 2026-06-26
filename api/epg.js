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

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).send("EPG Error: " + error.message);
  }
}