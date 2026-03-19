"""WebSocket notification channel for investor push updates."""

from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["notifications"])

# In-memory registry of connected investor WebSockets
_investor_connections: dict[str, WebSocket] = {}


@router.websocket("/notifications/stream")
async def notification_stream(websocket: WebSocket):
    """Accept investor WebSocket connections for real-time notifications."""
    await websocket.accept()
    conn_id = str(id(websocket))
    _investor_connections[conn_id] = websocket

    try:
        while True:
            await websocket.receive_text()  # keep-alive
    except WebSocketDisconnect:
        _investor_connections.pop(conn_id, None)
    except Exception:
        _investor_connections.pop(conn_id, None)


async def broadcast_approved_answer(
    query_id: str, answer: str, confidence_tier: str
) -> None:
    """Broadcast an approved answer to all connected investor WebSockets."""
    message = {
        "type": "answer_approved",
        "query_id": query_id,
        "answer": answer,
        "confidence_tier": "verified",
    }
    dead: list[str] = []
    for conn_id, ws in _investor_connections.items():
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(conn_id)

    for conn_id in dead:
        _investor_connections.pop(conn_id, None)
