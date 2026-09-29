export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Supabase environment variables are missing"
      });
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/articles?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();

      return res.status(response.status).json({
        error
      });
    }

    const articles = await response.json();

    return res.status(200).json({
      success: true,
      articles
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}
