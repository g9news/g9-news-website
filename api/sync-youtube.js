export default async function handler(req, res) {
  try {
    const channelId = "UCl-cEVR90aGMMlWh7_pbMlQ";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Supabase environment variables are missing"
      });
    }

    // Get latest G9 News videos from YouTube
    const youtubeResponse = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
    );

    if (!youtubeResponse.ok) {
      return res.status(500).json({
        error: "Unable to fetch YouTube feed"
      });
    }

    const xml = await youtubeResponse.text();

    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
      .slice(0, 10)
      .map(match => {
        const item = match[1];

        const get = tag => {
          const result = item.match(
            new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
          );

          return result
            ? result[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()
            : "";
        };

        const videoId = get("yt:videoId");

       
