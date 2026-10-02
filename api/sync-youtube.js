module.exports = async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Supabase environment variables are missing"
      });
    }

    const channelId = "UCl-cEVR90aGMMlWh7_pbMlQ";

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
      .map((match) => {
        const item = match[1];

        const get = (tag) => {
          const result = item.match(
            new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
          );
          return result
            ? result[1].replace(/<!\[CDATA\[|\]\]>/g, "")
            : "";
        };

        const videoId = get("yt:videoId");

        return {
          youtube_video_id: videoId,
          title: get("title"),
          thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          published_at: get("published")
        };
      });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/videos?on_conflict=youtube_video_id`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=minimal"
        },
        body: JSON.stringify(videos)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    return res.status(200).json({
      success: true,
      checked: videos.length,
      message: "YouTube sync completed"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
};
