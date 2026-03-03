(() => {
  const TOKEN_ENDPOINT = "/api/cad/check-generation-limit";
  const SR_ENDPOINT = "/api/super-resolution/check-limits";
  let lastTokenUrl = "https://printpal.io/api/cad/check-generation-limit?input_modality=image";
  let lastSrUrl = "https://printpal.io/api/super-resolution/check-limits";

  function post(data, url) {
    try {
      if (url) {
        if (url.includes(SR_ENDPOINT)) {
          lastSrUrl = url;
        } else if (url.includes(TOKEN_ENDPOINT)) {
          lastTokenUrl = url;
        }
      }
      window.postMessage(
        {
          type: "PRINTPAL_TOKEN_DATA",
          url,
          data: {
            ...data,
            _capturedAt: Date.now()
          }
        },
        "*"
      );
    } catch (_) {
      // no-op
    }
  }

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const reqUrl = args[0] && typeof args[0] === "string" ? args[0] : args[0]?.url;
      if (reqUrl && reqUrl.includes(TOKEN_ENDPOINT)) {
        const cloned = response.clone();
        const data = await cloned.json();
        post(data, reqUrl);
      } else if (reqUrl && reqUrl.includes(SR_ENDPOINT)) {
        const cloned = response.clone();
        const data = await cloned.json();
        post(data, reqUrl);
      }
    } catch (_) {
      // ignore parsing errors
    }
    return response;
  };

  const OriginalXHR = window.XMLHttpRequest;
  function WrappedXHR() {
    const xhr = new OriginalXHR();
    let requestUrl = "";

    const originalOpen = xhr.open;
    xhr.open = function (...openArgs) {
      requestUrl = openArgs[1];
      return originalOpen.apply(xhr, openArgs);
    };

    xhr.addEventListener("load", () => {
      try {
        if (requestUrl && (requestUrl.includes(TOKEN_ENDPOINT) || requestUrl.includes(SR_ENDPOINT))) {
          const data = JSON.parse(xhr.responseText);
          post(data, requestUrl);
        }
      } catch (_) {
        // ignore parsing errors
      }
    });

    return xhr;
  }

  window.XMLHttpRequest = WrappedXHR;

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    if (!event.data) return;
    try {
      if (event.data.type === "PRINTPAL_TOKEN_REFRESH") {
        const res = await originalFetch(lastTokenUrl, { credentials: "include" });
        const data = await res.json();
        post(data, lastTokenUrl);
      } else if (event.data.type === "PRINTPAL_SR_REFRESH") {
        const res = await originalFetch(lastSrUrl, { credentials: "include" });
        const data = await res.json();
        post(data, lastSrUrl);
      }
    } catch (_) {
      // ignore refresh errors
    }
  });
})();
