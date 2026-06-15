export default {
  async fetch(request) {
    // 1. Verification (GET)
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("hub.verify_token") === "djefhe4583!sskdcdhry") {
        return new Response(url.searchParams.get("hub.challenge"), { status: 200 });
      }
    }

    // 2. Incoming Messages (POST)
    if (request.method === "POST") {
      const body = await request.json();
      
      // Let's log the full body to see the exact structure
      console.log("Full Body:", JSON.stringify(body));

      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message) {
        console.log("Message detected from:", message.from);
        
        // Make the API call
        const phone_number_id = "1170793479454147";
        const token = "EAAONYs8CjAMBRgarZAtiTZAx2Xwsu0I4134rARAd7jZAW1ObP0Clua4a8ApuTuPZAph1VuU8SF0Gjgp9QRSmBiYJrpkZB3Ux0g942RZABaHMvcFt8WDT1Q45EZCsR0LZBO8pZBZAlqxbu6ZBm26fLFiH3qDO62srWprmJ9tpgPB7sxcXr9HpZA3IOK1Lza77C4nqrMvZBBNF6W2tOcYJUeCZCuETcqfVsfaHzrT4ZBMQocmJh72CrzYZBQwebJaQGTZAIROWhnxHij8unPoROb1FUSHhgrQzPDZAJmegZDZD"; // PASTE FRESH TOKEN HERE

        const response = await fetch(`https://graph.facebook.com/v21.0/${phone_number_id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: message.from,
            text: { body: "Bot received your message!" },
          }),
        });

        const result = await response.json();
        console.log("API RESULT:", JSON.stringify(result));
      } else {
        console.log("No message found in this payload.");
      }

      return new Response("OK", { status: 200 });
    }
    return new Response("OK", { status: 200 });
  }
};