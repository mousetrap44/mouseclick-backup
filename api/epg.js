export default async function handler(req, res) {
  try {
    const url =
      "https://raw.githubusercontent.com/djdoolky76/Mediaquest-EPG/main/cignal_epg.xml";

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).send("Unable to fetch EPG");
    }

    const xml = await response.text();

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900");

    return res.status(200).send(xml);

  } catch (err) {
    return res.status(500).send(err.toString());
  }
}
