export default async function handler(req, res) {
  try {
    const channelId = "UCl-cEVR90aGMMlWh7_pbMlQ";

    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
    );

    if (!response.ok) {
      return res.status(500).json({ error: "Unable to fetch YouTube feed" });
    }

    const xml = await response.text();

    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
      .slice(0, 10)
      .map(match => {
        const item = match[1];

        const get = tag => {
          const match = item.match(
            new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
          );
          return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, "") : "";
        };

        const videoId = get("yt:videoId");
        const title = get("title");
        const published = get("published");

        return {
          videoId,
          title,
          published,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`
        };
      });

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json({ videos: entries });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}
