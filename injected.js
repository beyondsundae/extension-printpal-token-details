(() => {
  const ENDPOINT_SUBSTR = "/api/cad/check-generation-limit";

  let lastUrl = "https://printpal.io/api/cad/check-generation-limit?input_modality=image";

  function post(data, url) {
    try {
      if (url) lastUrl = url;
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
      if (reqUrl && reqUrl.includes(ENDPOINT_SUBSTR)) {
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
        if (requestUrl && requestUrl.includes(ENDPOINT_SUBSTR)) {
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
    if (!event.data || event.data.type !== "PRINTPAL_TOKEN_REFRESH") return;
    try {
      const res = await originalFetch(lastUrl, { credentials: "include" });
      const data = await res.json();
      post(data, lastUrl);
    } catch (_) {
      // ignore refresh errors
    }
  });
})();
