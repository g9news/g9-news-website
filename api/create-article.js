module.exports = async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
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

      // Convert transcript into a professional Telugu news report using Gemini
      const aiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      `You are an editor for G9 News Telugu.

Convert the supplied Telugu YouTube transcript into a professional Telugu news report.

Rules:
- Stay strictly factual.
- Do not invent names, quotes, dates, numbers, locations, allegations, or political claims.
- Preserve attribution and uncertainty.
- Remove subtitle timestamps and repetition.
- Write natural, polished Telugu news language.
- Return ONLY JSON matching the requested schema.

Video title:
${video.title}

Transcript:
${transcriptData.transcript}`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  title: {
                    type: "STRING"
                  },
                  summary: {
                    type: "STRING"
                  },
                  body: {
                    type: "STRING"
                  }
                },
                required: ["title", "summary", "body"]
              }
            }
          })
        }
      );

      const aiData = await aiResponse.json();

      if (!aiResponse.ok) {
        console.error("Gemini error:", aiData);
        continue;
      }

      const outputText =
        aiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!outputText) {
        console.error("Gemini returned no text");
        continue;
      }

      let report;

      try {
        report = JSON.parse(outputText);
      } catch {
        console.error("Could not parse Gemini report");
        continue;
      }

      // Save as draft for review
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
