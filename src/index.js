export default {
  async fetch(request) {
    // 1. Webhook Verification
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("hub.verify_token") === "djefhe4583!sskdcdhry") {
        return new Response(url.searchParams.get("hub.challenge"), { status: 200 });
      }
      return new Response("Verification failed", { status: 403 });
    }

    // 2. Handling Incoming Messages
    if (request.method === "POST") {
      const body = await request.json();
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message) {
        const sender = message.from;
        
        // ==========================================
        // ADD YOUR CREDENTIALS HERE
        // ==========================================
        const PHONE_NUMBER_ID = "1170793479454147";
        const ACCESS_TOKEN = "EAAONYs8CjAMBRhrkwXUqSpu8eZBzzILtQbZBYTVs5H4yVsj6niBWncYGNWvARW3YKIfaF73KvthlbQJxg5q47MbUZBQsppwdd7m2IHwL4xgG0JndJuBlyo2xgk33DrvRsHUE24btf6lZA9hG1VWOF1n2hEyXW81ZCGIOdNKwNwwPxbKdsC60AAEVSTyW0QGdrZCFkC9aW28rVRFzZA4G2KP5IdDxIOzEUZAPSrWqz6j0"; 
        const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxYVJTiSv_163A83NJfbNjymBbNso0duVTUuoBM5YZoZ5ufQoCh2afKfAcpGoUz9R5T/exec"; 

        // Check user status
        const userRes = await fetch(`${SHEET_API_URL}?action=getUser&phone=${sender}`);
        const userData = await userRes.json();
        const userState = userData.state || "not_found";

        // --- SCENARIO A: Text Message (Typing Name, Address, or 'Hi') ---
        if (message.type === "text") {
          const text = message.text.body.trim();

          if (userState === "AWAITING_NAME") {
            await fetch(SHEET_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateName", phone: sender, name: text }) });
            await sendTextMessage(sender, PHONE_NUMBER_ID, ACCESS_TOKEN, `Thanks, ${text}! \n\nLastly, please reply with your **Shop Address** to confirm the order.`);
          } 
          else if (userState === "AWAITING_ADDRESS") {
            const finalRes = await fetch(SHEET_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateAddressAndOrder", phone: sender, address: text }) });
            const finalData = await finalRes.json();
            
            await sendTextMessage(sender, PHONE_NUMBER_ID, ACCESS_TOKEN, `✅ Registration Complete & Order Confirmed!\n\nItem: ${finalData.order.items}\nTotal: ₹${finalData.order.totalValue}\n\nYour godown will dispatch this tomorrow.`);
          } 
          else {
            // If they are REGISTERED or brand new, standard text gets the menu
            await sendLiveInventoryMenu(sender, PHONE_NUMBER_ID, ACCESS_TOKEN, SHEET_API_URL, userData);
          }
        }

        // --- SCENARIO B: Interactive Message (Menu Tap) ---
        else if (message.type === "interactive") {
          const id = message.interactive.list_reply.id;
          
          if (id.startsWith("order_")) {
            const parts = id.split("_"); 
            const price = parseFloat(parts[2]);
            const itemName = parts.slice(3).join("_"); 
            
            const orderPayload = { 
              items: `${itemName} (1kg)`, 
              rawItemName: itemName, 
              totalValue: price 
            };

            if (userState === "not_found" || userState === "AWAITING_NAME" || userState === "AWAITING_ADDRESS") {
              await fetch(SHEET_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "startRegistration", phone: sender, pendingOrder: orderPayload }) });
              await sendTextMessage(sender, PHONE_NUMBER_ID, ACCESS_TOKEN, `You selected *${itemName}*.\n\n_Note: This order will be placed as soon as you provide your details._\n\nFirst, please reply with your **Shop Name**.`);
            } 
            else if (userState === "REGISTERED") {
              await fetch(SHEET_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addOrder", phone: sender, ...orderPayload }) });
              await sendTextMessage(sender, PHONE_NUMBER_ID, ACCESS_TOKEN, `✅ Order Confirmed, ${userData.user.name}!\n\nItem: ${itemName}\nQuantity: 1kg\nTotal: ₹${price}\n\nIt will be delivered tomorrow.`);
            }
          }
        }
      }
      return new Response("OK", { status: 200 });
    }
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function sendLiveInventoryMenu(to, phone_id, token, sheet_url, userData) {
  const sheetResponse = await fetch(`${sheet_url}?action=getInventory`);
  const sheetJson = await sheetResponse.json();
  const inventoryData = sheetJson.data || [];

  if (inventoryData.length === 0) {
    await sendTextMessage(to, phone_id, token, "Sorry, all items are currently out of stock. Please check back later.");
    return;
  }

  const rows = inventoryData.map(item => ({
    id: `order_${item.id}_${item.price}_${item.name}`, 
    title: item.name.substring(0, 24), 
    description: `₹${item.price}/kg | Stock: ${item.stock}kg` 
  }));

  const greeting = userData.status === "success" ? `Welcome back, *${userData.user.name}*! 👋\n\n` : `Welcome to Vashi Wholesale! 🏬\n\n`;

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
        body: { text: greeting + "Tap to select an item to order 1kg instantly:" },
        action: { button: "View Inventory", sections: [{ title: "Available Items", rows: rows.slice(0, 10) }] }
      }
    }),
  });
}

async function sendTextMessage(to, phone_id, token, text) {
  await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
    method: "POST", 
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to, text: { body: text } })
  });
}