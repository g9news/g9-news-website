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

    // Verify login
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

    // Verify admin
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

    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const fileBuffer = Buffer.concat(chunks);

    if (!fileBuffer.length) {
      return res.status(400).json({ error: "No image received" });
    }

    const contentType = req.headers["content-type"] || "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ error: "Only images are allowed" });
    }

    const originalName = decodeURIComponent(
      req.headers["x-file-name"] || "article-image.jpg"
    );

    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const fileName = `${Date.now()}-${safeName}`;

    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/article-images/${encodeURIComponent(fileName)}`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": contentType,
          "x-upsert": "false"
        },
        body: fileBuffer
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Image upload error:", errorText);
      return res.status(500).json({ error: "Photo upload failed" });
    }

    const publicUrl =
      `${supabaseUrl}/storage/v1/object/public/article-images/${encodeURIComponent(fileName)}`;

    return res.status(200).json({
      success: true,
      url: publicUrl
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Photo upload failed" });
  }
};
