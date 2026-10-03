module.exports = async function handler(req, res) {
  try {
    const videoId = req.query.videoId;

    if (!videoId) {
      return res.status(400).json({
        error: "videoId is required"
      });
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(500).json({
        error: "YouTube OAuth configuration missing"
      });
    }

    // Get a fresh access token
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token"
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(tokenResponse.status).json({
        error: tokenData
      });
    }

    const accessToken = tokenData.access_token;
const channelResponse = await fetch(
  "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
  {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
);

const channelData = await channelResponse.json();

return res.status(200).json({
  authorized_channel: channelData
});
    // Find caption tracks for this video
    const captionsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${encodeURIComponent(videoId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const captionsData = await captionsResponse.json();

    if (!captionsResponse.ok) {
      return res.status(captionsResponse.status).json({
        error: captionsData
      });
    }

    if (!captionsData.items || captionsData.items.length === 0) {
      return res.status(200).json({
        success: true,
        captions_available: false,
        message: "No caption track available yet"
      });
    }

    // Prefer Telugu if available
    const caption =
      captionsData.items.find(
        item => item.snippet && item.snippet.language === "te"
      ) || captionsData.items[0];

    // Download caption as VTT
    const downloadResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${encodeURIComponent(caption.id)}?tfmt=vtt`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!downloadResponse.ok) {
      return res.status(downloadResponse.status).json({
        error: await downloadResponse.text()
      });
    }

    const transcript = await downloadResponse.text();

    return res.status(200).json({
      success: true,
      captions_available: true,
      language: caption.snippet.language,
      transcript
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "Transcript retrieval failed"
    });
  }
};
