"""WebSocket notification channel for investor and founder push updates."""

from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["notifications"])

# In-memory registry of connected investor WebSockets
_investor_connections: dict[str, WebSocket] = {}

# In-memory registry of connected founder WebSockets (list for multiple tabs)
_founder_connections: dict[str, list[WebSocket]] = {}


async def register_founder(founder_id: str, ws: WebSocket) -> None:
    """Register a founder WebSocket connection."""
    if founder_id not in _founder_connections:
        _founder_connections[founder_id] = []
    _founder_connections[founder_id].append(ws)


async def unregister_founder(founder_id: str, ws: WebSocket) -> None:
    """Unregister a founder WebSocket connection."""
    if founder_id in _founder_connections:
        try:
            _founder_connections[founder_id].remove(ws)
        except ValueError:
            pass
        if not _founder_connections[founder_id]:
            del _founder_connections[founder_id]


async def notify_founder(founder_id: str, message: dict) -> None:
    """Send a message to all connected founder WebSockets."""
    if founder_id not in _founder_connections:
        return

    dead: list[WebSocket] = []
    for ws in _founder_connections[founder_id]:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)

    for ws in dead:
        try:
            _founder_connections[founder_id].remove(ws)
        except ValueError:
            pass

    if founder_id in _founder_connections and not _founder_connections[founder_id]:
        del _founder_connections[founder_id]


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
