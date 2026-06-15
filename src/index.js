export default {
  async fetch(request) {
    // 1. Verification (GET request)
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("hub.verify_token") === "djefhe4583!sskdcdhry") {
        return new Response(url.searchParams.get("hub.challenge"), { status: 200 });
      }
      return new Response("Verification failed", { status: 403 });
    }

    // 2. Incoming Messages (POST request)
    if (request.method === "POST") {
      const body = await request.json();
      const value = body.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];

      if (message) {
        const sender = message.from;
        // REPLACE THESE WITH YOUR ACTUAL VALUES
        const PHONE_NUMBER_ID = "1170793479454147";
        const ACCESS_TOKEN = "EAAONYs8CjAMBRjSI2fOx0hI6RePHSm1egsA85uqrs6Nrwxv8nZB7lmrAPEZBuzzT9XJ3QBEKucMRZC9piTcYoM5dTpqBmR33xSlpYdO58qOm6cZAmnoZCjHhhY4qM1QsIRG5RJgo9K0zhIg5GeVJhMAX6JFA5ltG41ZBdI4pfHF7m9vZApTCD303ZC2cEzLwQBVXhgdCy0pbZCg3Ysni1LRNn3eM8NnqVBijrXO2Kaes18X0WzR3MphPKG4PW83ZAZBOjUNNecUtdgMi5gSKFtXX6G623bp"; 

        if (message.type === "text") {
          await sendInteractiveMenu(sender, PHONE_NUMBER_ID, ACCESS_TOKEN);
        } else if (message.type === "interactive") {
          const optionId = message.interactive.list_reply.id;
          await handleMenuSelection(sender, optionId, PHONE_NUMBER_ID, ACCESS_TOKEN);
        }
      }
      return new Response("OK", { status: 200 });
    }
  },
};

async function sendInteractiveMenu(to, phone_id, token) {
  await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: "Gaurav PG Services" },
        body: { text: "Welcome! Bed available from July 1st. How can I help you?" },
        action: {
          button: "Menu",
          sections: [{
            title: "Select an option",
            rows: [
              { id: "schedule_visit", title: "📅 Schedule a Visit" },
              { id: "faq", title: "❓ View FAQ" },
              { id: "talk_to_gaurav", title: "📞 Talk to Gaurav" }
            ]
          }]
        }
      }
    }),
  });
}

async function handleMenuSelection(to, id, phone_id, token) {
  let replyText = "";
  if (id === "schedule_visit") replyText = "Great! Please share your preferred visit time.";
  if (id === "faq") replyText = "Rent: 8k-12k. No brokerage. Includes WiFi/Gas.";
  if (id === "talk_to_gaurav") replyText = "Gaurav will call you soon. Please leave your name.";

  await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      text: { body: replyText }
    }),
  });
}