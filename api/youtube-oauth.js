module.exports = async function handler(req, res) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      error: "YouTube Client ID missing"
    });
  }

  const redirectUri =
    "https://g9newstelugu.com/api/youtube-oauth-callback";

  const scope =
    "https://www.googleapis.com/auth/youtube.force-ssl";

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scope,
      access_type: "offline",
      prompt: "consent"
    }).toString();

  return res.redirect(authUrl);
};
