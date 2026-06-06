chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "SEND_MAP") return;

  console.log("[zipCheats background] Message received, sending to Vite...");

  fetch("http://localhost:5173/api/zip/map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: message.data, url: message.url }),
  })
    .then(() => {
      console.log("[zipCheats background] Map sent to dev app");
      sendResponse({ ok: true });
    })
    .catch((err) => {
      console.error("[zipCheats background] Failed:", err);
      sendResponse({ ok: false, error: err.message });
    });

  return true;
});
