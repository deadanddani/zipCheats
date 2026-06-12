const DEV_APP_URL = "http://localhost:5173";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SEND_MAP") return;

  fetch(`${DEV_APP_URL}/api/zip/map`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: message.data, url: message.url }),
  })
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });

  return true;
});
