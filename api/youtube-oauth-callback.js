module.exports = async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        error: "Authorization code missing"
      });
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "YouTube OAuth configuration missing"
      });
    }

    const redirectUri =
      "https://g9newstelugu.com/api/youtube-oauth-callback";

    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(tokenResponse.status).json({
        error: tokens
      });
    }

    // Temporary step: confirms OAuth works.
    // We will store the refresh token securely next.
    return res.status(200).json({
      success: true,
      message: "G9 News YouTube authorization successful",
     refresh_token: tokens.refresh_token
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "OAuth callback failed"
    });
  }
};
