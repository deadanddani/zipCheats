const DEV_APP_URL = "http://localhost:5173";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SEND_MAP") return;

  console.log("[zipCheats background] Message received, sending to Vite...");

  fetch(`${DEV_APP_URL}/api/zip/map`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: message.data, url: message.url }),
  })
    .then(() => {
      console.log("[zipCheats background] Map sent to dev app");
      // Note: ?zipCheats=1 now means "auto-solve on this page" (handled by the
      // content script), so we no longer redirect the tab to the dev app here.
      sendResponse({ ok: true });
    })
    .catch((err) => {
      console.error("[zipCheats background] Failed:", err);
      sendResponse({ ok: false, error: err.message });
    });

  return true;
});
