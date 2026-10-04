module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");

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

    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: "Article ID required" });
    }

    const deleteResponse = await fetch(
      `${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=minimal"
        }
      }
    );

    if (!deleteResponse.ok) {
      return res.status(500).json({ error: "Could not delete article" });
    }

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not delete article" });
  }
};
