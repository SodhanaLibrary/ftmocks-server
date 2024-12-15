window.FTMOCKS_CONFIG = {
  url: 'http://localhost:5000/api/v1/recordMockdata',
};

(function () {
  // Intercept Fetch API
  const originalFetch = window.fetch;

  window.fetch = async function (url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body;
    const headers = options.headers || {};
    const queryString = url.includes('?') ? url.split('?')[1] : null;
    const response = await originalFetch(url, options);
    const ftMocksURL = new URL(window.FTMOCKS_CONFIG.url);
    const currentURL = new URL(
      url.startsWith('http') ? url : `http://something/${url}`
    );
    const clonedResponse = response.clone();
    let postData = null;
    if (method.toUpperCase() !== 'GET' && (headers['Content-Type'] || body)) {
      postData = { mimeType: headers['Content-Type'] || null, text: body };
    }
    clonedResponse.text().then((text) => {
      if (ftMocksURL.hostname !== currentURL.hostname && xhr.status < 300) {
        const mockResponse = {
          url: url,
          time: new Date().toString(),
          method: method,
          request: {
            headers: headers,
            queryString: queryString,
            postData: postData,
          },
          response: {
            status: response.status,
            headers: Array.from(clonedResponse.headers.entries()),
            content: text,
          },
        };
        fetch(window.FTMOCKS_CONFIG.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockResponse),
        }).then((response) => response.json());
      }
    });
    return response;
  };

  // Intercept XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;

  function MockXHR() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    const originalSetRequestHeader = xhr.setRequestHeader;
    let requestDetails = {
      headers: {},
    };

    // Override 'open' method
    xhr.open = function (method, url, async, user, password) {
      requestDetails.method = method;
      requestDetails.url = url;
      requestDetails.async = async;
      requestDetails.user = user;
      requestDetails.password = password;
      requestDetails.queryString = url.includes('?') ? url.split('?')[1] : null;
      originalOpen.apply(xhr, arguments);
    };

    // Override 'setRequestHeader' to log headers
    xhr.setRequestHeader = function (header, value) {
      requestDetails.headers[header] = value;
      originalSetRequestHeader.apply(xhr, arguments);
    };

    // Override 'send' method
    xhr.send = function (body) {
      requestDetails.body = body;
      const originalOnReadyStateChange = xhr.onreadystatechange;
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          // Complete
          const ftMocksURL = new URL(window.FTMOCKS_CONFIG.url);
          const currentURL = new URL(
            requestDetails.url.startsWith('http')
              ? requestDetails.url
              : `http://something/${requestDetails.url}`
          );
          let postData = null;
          if (
            requestDetails.method.toUpperCase() !== 'GET' &&
            (requestDetails.headers['Content-Type'] || requestDetails.body)
          ) {
            postData = {
              mimeType: requestDetails.headers['Content-Type'] || null,
              text: requestDetails.body,
            };
          }

          if (ftMocksURL.hostname !== currentURL.hostname && xhr.status < 300) {
            const mockResponse = {
              url: requestDetails.url,
              time: new Date().toString(),
              method: requestDetails.method,
              request: {
                headers: requestDetails.headers,
                queryString: requestDetails.queryString,
                postData: postData,
              },
              response: {
                status: xhr.status,
                headers: xhr.getAllResponseHeaders(),
                content: xhr.responseText,
              },
            };
            fetch(window.FTMOCKS_CONFIG.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(mockResponse),
            }).then((response) => response.json());
          }
        }
        if (originalOnReadyStateChange)
          originalOnReadyStateChange.apply(xhr, arguments);
      };
      originalSend.apply(xhr, arguments);
    };

    return xhr;
  }

  window.XMLHttpRequest = MockXHR;
})();
