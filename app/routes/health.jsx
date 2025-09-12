// Health check and diagnostics endpoint for Railway
export async function loader() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.1.0",
    environment: process.env.NODE_ENV || "development",
    database: process.env.DATABASE_URL ? "configured" : "missing",
    shopify: {
      api_key: process.env.SHOPIFY_API_KEY ? "configured" : "missing",
      api_secret: process.env.SHOPIFY_API_SECRET ? "configured" : "missing",
    }
  };

  return new Response(JSON.stringify(health, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export default function Health() {
  return (
    <div style={{ fontFamily: "monospace", padding: "20px" }}>
      <h1>Health Check</h1>
      <p>Service is running. Check JSON response for detailed status.</p>
    </div>
  );
}