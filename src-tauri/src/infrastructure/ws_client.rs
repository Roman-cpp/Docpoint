use std::collections::HashMap;

use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::{HeaderName, HeaderValue};
use tokio_tungstenite::tungstenite::Message;

use crate::domain::websocket::dto::WsEvent;
use crate::state::WsConn;

/// Opens a WebSocket connection to `url`, spawns the reader/writer tasks and
/// returns the live [`WsConn`]. Every incoming frame is emitted to the frontend
/// on the event channel `ws://{id}` (the caller supplies `id`).
pub async fn connect(
    app: AppHandle,
    id: String,
    url: String,
    headers: Option<HashMap<String, String>>,
) -> Result<WsConn, String> {
    // Some endpoints (e.g. Binance's AWS load balancers) intermittently close
    // the TCP connection mid-TLS-handshake ("tls handshake eof"). That is a
    // transient, retryable condition, so make a few attempts before giving up.
    // Each attempt is bounded by a timeout so an unreachable host can't leave
    // the frontend stuck on "Connecting…" indefinitely.
    const MAX_ATTEMPTS: u32 = 4;
    let mut last_err;
    let mut attempt = 0;
    let ws = loop {
        attempt += 1;

        let mut request = url.as_str().into_client_request().map_err(|e| e.to_string())?;
        if let Some(headers) = &headers {
            let h = request.headers_mut();
            for (k, v) in headers {
                let name = HeaderName::from_bytes(k.as_bytes()).map_err(|e| e.to_string())?;
                let value = HeaderValue::from_str(v).map_err(|e| e.to_string())?;
                h.insert(name, value);
            }
        }

        match tokio::time::timeout(
            std::time::Duration::from_secs(15),
            tokio_tungstenite::connect_async(request),
        )
        .await
        {
            Ok(Ok((ws, _resp))) => break ws,
            Ok(Err(e)) => last_err = e.to_string(),
            Err(_) => last_err = "connection timed out after 15s".to_string(),
        }

        if attempt >= MAX_ATTEMPTS {
            return Err(last_err);
        }
        // Small backoff before retrying the handshake.
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    };
    let (mut sink, mut stream) = ws.split();

    let event = format!("ws://{id}");
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    // Writer: drain the outgoing queue into the socket. Ends when every `tx`
    // is dropped (i.e. the connection is removed from the registry).
    let writer = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sink.send(msg).await.is_err() {
                break;
            }
        }
        let _ = sink.close().await;
    });

    // Reader: forward incoming frames to the frontend as `WsEvent`s.
    let handle = tokio::spawn(async move {
        let _ = app.emit(&event, WsEvent::Open);
        while let Some(item) = stream.next().await {
            match item {
                Ok(Message::Text(text)) => {
                    let _ = app.emit(&event, WsEvent::Message { text: text.to_string() });
                }
                Ok(Message::Binary(bytes)) => {
                    let _ = app.emit(
                        &event,
                        WsEvent::Message { text: String::from_utf8_lossy(&bytes).into_owned() },
                    );
                }
                Ok(Message::Close(frame)) => {
                    let (code, reason) = frame
                        .map(|f| (Some(f.code.into()), f.reason.to_string()))
                        .unwrap_or((None, String::new()));
                    let _ = app.emit(&event, WsEvent::Closed { code, reason });
                    break;
                }
                // Ping/Pong are answered by tungstenite automatically.
                Ok(_) => {}
                Err(e) => {
                    let _ = app.emit(&event, WsEvent::Error { message: e.to_string() });
                    break;
                }
            }
        }
        writer.abort();
    });

    Ok(WsConn { tx, handle })
}

/// Queues a text frame for delivery over an open connection.
pub fn send(conn: &WsConn, text: String) -> Result<(), String> {
    conn.tx
        .send(Message::Text(text.into()))
        .map_err(|_| "connection is closed".to_string())
}

/// Gracefully closes a connection: sends a close frame, then aborts the reader.
/// Dropping `conn` afterwards lets the writer finish and close the socket.
pub fn close(conn: WsConn) {
    let _ = conn.tx.send(Message::Close(None));
    conn.handle.abort();
}
