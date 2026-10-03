module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      return res.status(500).json({ error: "Server configuration missing" });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const response = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: publishableKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({
      success: true,
      access_token: data.access_token
    });

  } catch (error) {
    return res.status(500).json({ error: "Login failed" });
  }
};
