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

        return {
          youtube_video_id: videoId,
          title: get("title"),
          thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          published_at: get("published")
        };
      });

    let added = 0;

    for (const video of videos) {
      // Check whether this video already exists
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/videos?youtube_video_id=eq.${encodeURIComponent(
          video.youtube_video_id
        )}&select=id`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        }
      );

      if (!checkResponse.ok) {
        const error = await checkResponse.text();
        return res.status(checkResponse.status).json({ error });
      }

      const existing = await checkResponse.json();

      if (existing.length > 0) {
        continue;
      }

      // Save new video in Supabase
      const insertResponse = await fetch(
        `${supabaseUrl}/rest/v1/videos`,
        {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify(video)
        }
      );

      if (!insertResponse.ok) {
        const error = await insertResponse.text();
        return res.status(insertResponse.status).json({ error });
      }

      added++;
    }

    return res.status(200).json({
      success: true,
      checked: videos.length,
      added
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}
