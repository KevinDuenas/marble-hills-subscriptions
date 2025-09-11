// Health check endpoint for Railway
export async function loader() {
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

export default function Ping() {
  return <div>OK</div>;
}