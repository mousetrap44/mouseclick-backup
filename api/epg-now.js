export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(200).json({
    "tv5.ph": {
      "now": {
        "title": "TV5 Test Program",
        "start": "08:00",
        "stop": "09:00"
      },
      "next": {
        "title": "TV5 Next Test",
        "start": "09:00",
        "stop": "10:00"
      }
    }
  });
}