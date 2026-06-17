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
        
        // --- REPLACE THESE WITH YOUR ACTUAL VALUES ---
        const PHONE_NUMBER_ID = "1170793479454147";
        const ACCESS_TOKEN = "EAAONYs8CjAMBRhrkwXUqSpu8eZBzzILtQbZBYTVs5H4yVsj6niBWncYGNWvARW3YKIfaF73KvthlbQJxg5q47MbUZBQsppwdd7m2IHwL4xgG0JndJuBlyo2xgk33DrvRsHUE24btf6lZA9hG1VWOF1n2hEyXW81ZCGIOdNKwNwwPxbKdsC60AAEVSTyW0QGdrZCFkC9aW28rVRFzZA4G2KP5IdDxIOzEUZAPSrWqz6j0"; 
        const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyzDPxJZDEIafyy3UOkXVVzEzEySM9BWIWeyWT84YAhpqr4VhOLeHDJZ_qCFYkwpLnj/exec"; // <-- Paste your deployed Apps Script URL here

        if (message.type === "text") {
          await sendLiveInventoryMenu(sender, PHONE_NUMBER_ID, ACCESS_TOKEN, SHEET_API_URL);
        } else if (message.type === "interactive") {
          const optionId = message.interactive.list_reply.id;
          await handleMenuSelection(sender, optionId, PHONE_NUMBER_ID, ACCESS_TOKEN, SHEET_API_URL);
        }
      }
      return new Response("OK", { status: 200 });
    }
  },
};

// Helper: Fetch sheet data and send WhatsApp Menu
async function sendLiveInventoryMenu(to, phone_id, token, sheet_url) {
  // 1. Fetch live data from Google Sheets
  const sheetResponse = await fetch(sheet_url);
  const sheetJson = await sheetResponse.json();
  const inventoryData = sheetJson.data || [];

  // 2. Format the data into WhatsApp Menu Rows
  const rows = inventoryData.map(item => ({
    id: `order_${item.id}_${item.price}_${item.name}`, // We store the product info right inside the button ID
    title: item.name.substring(0, 24), // WhatsApp limits titles to 24 characters
    description: `₹${item.price}/kg | Stock: ${item.stock}kg` 
  }));

  if (rows.length === 0) {
    await sendTextMessage(to, phone_id, token, "Sorry, all items are currently out of stock. Please check back later.");
    return;
  }

  // 3. Send the native menu to WhatsApp
  await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: "Vashi Wholesale Live" },
        body: { text: "Welcome! Here is today's live stock and pricing. Tap to order 1 unit instantly:" },
        action: {
          button: "View Inventory",
          sections: [{
            title: "Available Items",
            rows: rows.slice(0, 10) // WhatsApp allows max 10 rows per section
          }]
        }
      }
    }),
  });
}

// Helper: Process the order when they tap an item
async function handleMenuSelection(to, id, phone_id, token, sheet_url) {
  // Check if the user tapped an order item
  if (id.startsWith("order_")) {
    const parts = id.split("_"); // e.g. ["order", "SKU001", "650", "Badaam (Premium)"]
    const skuId = parts[1];
    const price = parseFloat(parts[2]);
    const itemName = parts.slice(3).join("_"); 

    // 1. Send the order directly to Google Sheets
    const orderPayload = {
      phone: to,
      items: `${itemName} (1kg)`,
      totalValue: price
    };

    // Note: We don't use 'await' here because we don't want to make the WhatsApp reply wait for Google.
    fetch(sheet_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });

    // 2. Send instant confirmation to the user
    const replyText = `✅ Order Confirmed!\n\nItem: ${itemName}\nQuantity: 1kg\nTotal: ₹${price}\n\nThe trader has received your order and it will be delivered tomorrow.`;
    await sendTextMessage(to, phone_id, token, replyText);
  }
}

// Helper: Simple text message sender
async function sendTextMessage(to, phone_id, token, text) {
  await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      text: { body: text }
    }),
  });
}