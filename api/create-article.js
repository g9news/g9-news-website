module.exports = async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Supabase configuration missing"
      });
    }

    // Get videos that do not yet have an article
    const videosResponse = await fetch(
      `${supabaseUrl}/rest/v1/videos?select=*&order=published_at.desc&limit=10`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      }
    );

    if (!videosResponse.ok) {
      return res.status(videosResponse.status).json({
        error: await videosResponse.text()
      });
    }

    const videos = await videosResponse.json();

    let created = 0;

    for (const video of videos) {
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/articles?source_video_id=eq.${encodeURIComponent(
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
        return res.status(checkResponse.status).json({
          error: await checkResponse.text()
        });
      }

      const existing = await checkResponse.json();

      if (existing.length > 0) {
        continue;
      }

      // For now this creates a safe draft.
      // Transcript/report generation will be added next.
      const article = {
        title: video.title,
        summary: "",
        body: "",
        category: video.category || "Latest",
        language: "te",
        thumbnail_url: video.thumbnail_url,
        video_url: video.video_url,
        source_video_id: video.youtube_video_id,
        status: "draft",
        featured: false
      };

      const insertResponse = await fetch(
        `${supabaseUrl}/rest/v1/articles`,
        {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify(article)
        }
      );

      if (!insertResponse.ok) {
        return res.status(insertResponse.status).json({
          error: await insertResponse.text()
        });
      }

      created++;
    }

    return res.status(200).json({
      success: true,
      checked: videos.length,
      drafts_created: created
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
};
