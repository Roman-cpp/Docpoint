import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

type Header = { key: string; value: string };

interface ResponsePayload {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  duration_ms: number;
}

type ReqTab = "headers" | "body";
type RespTab = "body" | "headers";

function statusColor(status: number): string {
  if (status < 300) return "#4caf50";
  if (status < 400) return "#ff9800";
  return "#f44336";
}

function tryFormatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export default function App() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Header[]>([{ key: "", value: "" }]);
  const [body, setBody] = useState("");
  const [reqTab, setReqTab] = useState<ReqTab>("headers");
  const [respTab, setRespTab] = useState<RespTab>("body");
  const [response, setResponse] = useState<ResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setHeader(index: number, field: "key" | "value", val: string) {
    const next = headers.map((h, i) => (i === index ? { ...h, [field]: val } : h));
    if (index === headers.length - 1 && val !== "") {
      next.push({ key: "", value: "" });
    }
    setHeaders(next);
  }

  function removeHeader(index: number) {
    setHeaders(headers.filter((_, i) => i !== index));
  }

  async function sendRequest() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    const headerMap: Record<string, string> = {};
    for (const { key, value } of headers) {
      if (key.trim()) headerMap[key.trim()] = value;
    }

    try {
      const result = await invoke<ResponsePayload>("send_request", {
        payload: {
          method,
          url: url.trim(),
          headers: headerMap,
          body: body || null,
        },
      });
      setResponse(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const hasBody = ["POST", "PUT", "PATCH"].includes(method);

  return (
    <div className="app">
      <div className="request-bar">
        <select
          className="method-select"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input
          className="url-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendRequest()}
          placeholder="https://example.com/api"
        />
        <button className="send-btn" onClick={sendRequest} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>

      <div className="panels">
        <div className="panel request-panel">
          <div className="tabs">
            <button
              className={reqTab === "headers" ? "tab active" : "tab"}
              onClick={() => setReqTab("headers")}
            >
              Headers
            </button>
            <button
              className={reqTab === "body" ? "tab active" : "tab"}
              onClick={() => setReqTab("body")}
              disabled={!hasBody}
            >
              Body
            </button>
          </div>

          {reqTab === "headers" && (
            <div className="headers-editor">
              {headers.map((h, i) => (
                <div key={i} className="header-row">
                  <input
                    placeholder="Header-Name"
                    value={h.key}
                    onChange={(e) => setHeader(i, "key", e.target.value)}
                  />
                  <input
                    placeholder="value"
                    value={h.value}
                    onChange={(e) => setHeader(i, "value", e.target.value)}
                  />
                  {headers.length > 1 && (
                    <button className="remove-btn" onClick={() => removeHeader(i)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {reqTab === "body" && (
            <textarea
              className="body-editor"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{"key": "value"}'
            />
          )}
        </div>

        <div className="panel response-panel">
          {error && <div className="error">{error}</div>}

          {response && (
            <>
              <div className="response-meta">
                <span className="status" style={{ color: statusColor(response.status) }}>
                  {response.status} {response.status_text}
                </span>
                <span className="duration">{response.duration_ms} ms</span>
              </div>

              <div className="tabs">
                <button
                  className={respTab === "body" ? "tab active" : "tab"}
                  onClick={() => setRespTab("body")}
                >
                  Body
                </button>
                <button
                  className={respTab === "headers" ? "tab active" : "tab"}
                  onClick={() => setRespTab("headers")}
                >
                  Headers ({Object.keys(response.headers).length})
                </button>
              </div>

              {respTab === "body" && (
                <pre className="response-body">{tryFormatJson(response.body)}</pre>
              )}

              {respTab === "headers" && (
                <div className="headers-editor resp-headers">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="header-row resp-header-row">
                      <span className="resp-header-key">{k}</span>
                      <span className="resp-header-val">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!response && !error && !loading && (
            <div className="placeholder">Enter a URL and press Send</div>
          )}

          {loading && <div className="placeholder">Sending...</div>}
        </div>
      </div>
    </div>
  );
}
