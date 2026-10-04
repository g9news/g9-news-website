module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the logged-in Supabase user
    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!userResponse.ok) {
      return res.status(401).json({ error: "Invalid login" });
    }

    const user = await userResponse.json();

    // Check that this user is in the admins table
    const adminResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?email=eq.${encodeURIComponent(
        user.email
      )}&select=id,email,role`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      }
    );

    const admins = await adminResponse.json();
console.log("USER EMAIL:", user.email);
console.log("ADMIN CHECK:", admins);
    if (!adminResponse.ok || !admins.length) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Load draft articles
    const articlesResponse = await fetch(
      `${supabaseUrl}/rest/v1/articles?select=id,title,summary,status,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      }
    );

    if (!articlesResponse.ok) {
      return res.status(500).json({
        error: "Could not load articles"
      });
    }

    const articles = await articlesResponse.json();

    return res.status(200).json({
      success: true,
      articles
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });
  }
};
