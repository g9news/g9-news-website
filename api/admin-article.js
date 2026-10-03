module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const authHeader = req.headers.authorization;
    const id = req.query.id;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!id) {
      return res.status(400).json({ error: "Article ID required" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify logged-in Supabase user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      return res.status(401).json({ error: "Invalid login" });
    }

    const user = await userResponse.json();

    // Verify user is an admin
    const adminResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?email=eq.${encodeURIComponent(user.email)}&select=id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      }
    );

    const admins = await adminResponse.json();

    if (!adminResponse.ok || !admins.length) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Load requested article
    const articleResponse = await fetch(
      `${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      }
    );

    if (!articleResponse.ok) {
      return res.status(500).json({ error: "Could not load article" });
    }

    const articles = await articleResponse.json();

    if (!articles.length) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
res.setHeader("Pragma", "no-cache");
res.setHeader("Expires", "0");

return res.status(200).json({
  success: true,
  article: articles[0]
});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};
