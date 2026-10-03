module.exports = async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      return res.status(500).json({
        error: "Server configuration missing"
      });
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    };

    // Get latest YouTube videos
    const videosResponse = await fetch(
      `${supabaseUrl}/rest/v1/videos?select=*&order=published_at.desc&limit=10`,
      { headers }
    );

    if (!videosResponse.ok) {
      return res.status(videosResponse.status).json({
        error: await videosResponse.text()
      });
    }

    const videos = await videosResponse.json();
    let created = 0;

    for (const video of videos) {
      // Skip videos that already have an article
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/articles?source_video_id=eq.${encodeURIComponent(
          video.youtube_video_id
        )}&select=id`,
        { headers }
      );

      if (!checkResponse.ok) {
        return res.status(checkResponse.status).json({
          error: await checkResponse.text()
        });
      }

      const existing = await checkResponse.json();

      if (existing.length > 0) continue;

      // Get Telugu transcript
      const transcriptResponse = await fetch(
        `https://g9newstelugu.com/api/youtube-transcript?videoId=${encodeURIComponent(
          video.youtube_video_id
        )}`
      );

      const transcriptData = await transcriptResponse.json();

      if (
        !transcriptData.success ||
        !transcriptData.captions_available ||
        !transcriptData.transcript
      ) {
        continue;
      }

      // Convert transcript into a professional Telugu news report
      const aiResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-5-mini",
            instructions:
              "You are an editor for G9 News Telugu. Convert the supplied Telugu YouTube transcript into a professional Telugu news report. Stay strictly factual. Do not invent names, quotes, dates, numbers, locations, allegations, or political claims. Preserve attribution and uncertainty. Remove subtitle timestamps and repetition. Return ONLY valid JSON with exactly these keys: title, summary, body.",
            input: `Video title: ${video.title}\n\nTranscript:\n${transcriptData.transcript}`,
            text: {
              format: {
                type: "json_schema",
                name: "news_article",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    summary: { type: "string" },
                    body: { type: "string" }
                  },
                  required: ["title", "summary", "body"],
                  additionalProperties: false
                }
              }
            }
          })
        }
      );

      const aiData = await aiResponse.json();

      if (!aiResponse.ok) {
        console.error("OpenAI error:", aiData);
        continue;
      }

      const outputText =
        aiData.output_text ||
        aiData.output
          ?.flatMap(item => item.content || [])
          ?.find(item => item.type === "output_text")?.text;

      if (!outputText) continue;

      let report;

      try {
        report = JSON.parse(outputText);
      } catch {
        console.error("Could not parse AI report");
        continue;
      }

      // Save as draft for dad to review
      const article = {
        title: report.title || video.title,
        summary: report.summary || "",
        body: report.body || "",
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
            ...headers,
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
