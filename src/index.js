export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. WhatsApp Webhook Verification
    // Meta uses this to confirm that your URL is valid and belongs to you.
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      // Replace 'YOUR_VERIFY_TOKEN' with a secret string of your choice
      const MY_VERIFY_TOKEN = "djefhe4583!sskdcdhry";

      if (mode === "subscribe" && token === MY_VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    // 2. Incoming WhatsApp Message
    // This is where Meta sends the data when someone messages the PG.
    if (request.method === "POST") {
      const body = await request.json();
      
      // We print the message to the Cloudflare logs so we can see what's happening
      console.log("Message received:", JSON.stringify(body));
      
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  }
};