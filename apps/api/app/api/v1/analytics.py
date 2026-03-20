"""Analytics API: event ingestion, aggregation, and founder notifications."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request, Response, WebSocket, WebSocketDisconnect

from app.core.auth import get_current_user
from app.core.supabase import get_service_client
from app.models.analytics import (
    AnalyticsSummaryResponse,
    BeaconPayload,
    InvestorDetail,
    InvestorSummary,
    NewViewCountResponse,
    QuestionEntry,
    SectionTime,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analytics"])


@router.post("/analytics/events", status_code=204)
async def ingest_events(request: Request) -> Response:
    """Ingest analytics events from sendBeacon (may arrive as text/plain)."""
    body = await request.body()
    payload = BeaconPayload.model_validate_json(body)

    rows: list[dict] = []

    # page_open event
    rows.append({
        "founder_id": payload.founder_id,
        "user_id": payload.user_id,
        "share_token_id": payload.share_token_id,
        "session_id": payload.session_id,
        "event_type": "page_open",
        "metadata": {"session_start": payload.session_start},
    })

    # section_time events
    for evt in payload.events:
        rows.append({
            "founder_id": payload.founder_id,
            "user_id": payload.user_id,
            "share_token_id": payload.share_token_id,
            "session_id": payload.session_id,
            "event_type": "section_time",
            "section_id": evt.section_id,
            "duration_ms": evt.duration_ms,
        })

    # scroll_depth event
    if payload.scroll_depth is not None:
        rows.append({
            "founder_id": payload.founder_id,
            "user_id": payload.user_id,
            "share_token_id": payload.share_token_id,
            "session_id": payload.session_id,
            "event_type": "scroll_depth",
            "scroll_depth": payload.scroll_depth,
        })

    # page_close event
    rows.append({
        "founder_id": payload.founder_id,
        "user_id": payload.user_id,
        "share_token_id": payload.share_token_id,
        "session_id": payload.session_id,
        "event_type": "page_close",
        "metadata": {"session_end": payload.session_end},
    })

    client = get_service_client()
    client.table("analytics_events").insert(rows).execute()

    # First-view detection: check if this is the first page_open for this identity
    identity_filter = "user_id" if payload.user_id else "share_token_id"
    identity_value = payload.user_id or payload.share_token_id

    existing = (
        client.table("analytics_events")
        .select("id", count="exact")
        .eq("founder_id", payload.founder_id)
        .eq(identity_filter, identity_value)
        .eq("event_type", "page_open")
        .execute()
    )

    # count > 1 means we just inserted the first one plus this is a return visit
    page_open_count = existing.count if existing.count is not None else len(existing.data)
    is_first_view = page_open_count <= 1

    if is_first_view and payload.share_token_id:
        # Look up investor email from share_tokens
        token_row = (
            client.table("share_tokens")
            .select("investor_email, token")
            .eq("id", payload.share_token_id)
            .single()
            .execute()
        )
        investor_label = "An investor"
        if token_row.data and token_row.data.get("investor_email"):
            investor_label = token_row.data["investor_email"]

        from app.api.v1.notifications import notify_founder
        await notify_founder(payload.founder_id, {
            "type": "pitch_opened",
            "investor": investor_label,
            "share_token_id": payload.share_token_id,
        })

    return Response(status_code=204)


@router.get("/analytics/summary")
async def get_analytics_summary(
    user: dict = Depends(get_current_user),
) -> AnalyticsSummaryResponse:
    """Return aggregated investor analytics for the authenticated founder."""
    founder_id = user["sub"]
    client = get_service_client()

    # Get all analytics events for this founder
    events_result = (
        client.table("analytics_events")
        .select("*")
        .eq("founder_id", founder_id)
        .execute()
    )
    events = events_result.data or []

    # Get questions for this founder's investors
    queries_result = (
        client.table("queries")
        .select("id, user_id, share_token_id, created_at")
        .execute()
    )
    all_queries = queries_result.data or []

    # Get xlsx document IDs for financials time calculation
    docs_result = (
        client.table("documents")
        .select("id")
        .eq("file_type", "xlsx")
        .execute()
    )
    xlsx_doc_ids = {d["id"] for d in (docs_result.data or [])}

    # Get chunk section IDs from xlsx documents
    financials_sections: set[str] = set()
    if xlsx_doc_ids:
        for doc_id in xlsx_doc_ids:
            chunks_result = (
                client.table("chunks")
                .select("section_number")
                .eq("document_id", doc_id)
                .execute()
            )
            for chunk in (chunks_result.data or []):
                if chunk.get("section_number") is not None:
                    financials_sections.add(str(chunk["section_number"]))

    # Aggregate by investor identity
    investor_data: dict[str, dict] = {}

    for event in events:
        key = event.get("user_id") or event.get("share_token_id")
        if not key:
            continue

        if key not in investor_data:
            investor_data[key] = {
                "user_id": event.get("user_id"),
                "share_token_id": event.get("share_token_id"),
                "last_viewed": None,
                "total_time_ms": 0,
                "session_ids": set(),
                "max_scroll_depth": 0,
                "financials_time_ms": 0,
            }

        inv = investor_data[key]
        created = event.get("created_at")
        if created and (inv["last_viewed"] is None or created > inv["last_viewed"]):
            inv["last_viewed"] = created

        if event["event_type"] == "section_time":
            duration = event.get("duration_ms") or 0
            inv["total_time_ms"] += duration
            if event.get("section_id") and event["section_id"] in financials_sections:
                inv["financials_time_ms"] += duration

        inv["session_ids"].add(event["session_id"])

        if event["event_type"] == "scroll_depth" and event.get("scroll_depth"):
            inv["max_scroll_depth"] = max(inv["max_scroll_depth"], event["scroll_depth"])

    # Count questions per investor
    question_counts: dict[str, int] = {}
    for q in all_queries:
        qkey = q.get("user_id") or q.get("share_token_id")
        if qkey and qkey in investor_data:
            question_counts[qkey] = question_counts.get(qkey, 0) + 1

    # Build investor labels
    # Collect share_token_ids to look up
    share_token_ids = {
        v["share_token_id"] for v in investor_data.values()
        if v.get("share_token_id") and not v.get("user_id")
    }
    share_token_map: dict[str, dict] = {}
    for st_id in share_token_ids:
        try:
            st_result = (
                client.table("share_tokens")
                .select("id, investor_email, token")
                .eq("id", st_id)
                .single()
                .execute()
            )
            if st_result.data:
                share_token_map[st_id] = st_result.data
        except Exception:
            pass

    # Collect user_ids to look up emails
    user_ids = {
        v["user_id"] for v in investor_data.values()
        if v.get("user_id")
    }
    user_email_map: dict[str, str] = {}
    for uid in user_ids:
        try:
            u_result = (
                client.table("users")
                .select("id, email")
                .eq("id", uid)
                .single()
                .execute()
            )
            if u_result.data:
                user_email_map[uid] = u_result.data["email"]
        except Exception:
            pass

    # Build summaries
    investors: list[InvestorSummary] = []
    now = datetime.now(timezone.utc)

    for key, inv in investor_data.items():
        qcount = question_counts.get(key, 0)
        session_count = len(inv["session_ids"])

        # Determine label
        if inv.get("user_id") and inv["user_id"] in user_email_map:
            label = user_email_map[inv["user_id"]]
        elif inv.get("share_token_id") and inv["share_token_id"] in share_token_map:
            st = share_token_map[inv["share_token_id"]]
            if st.get("investor_email"):
                label = st["investor_email"]
            else:
                token_val = st.get("token", "")
                label = f"Anonymous (...{token_val[-4:]})" if len(token_val) >= 4 else "Anonymous"
        else:
            label = f"User {key[:8]}..."

        # Engagement tier
        engagement = "viewed"
        if inv["last_viewed"]:
            try:
                lv = datetime.fromisoformat(inv["last_viewed"].replace("Z", "+00:00"))
                if (now - lv).days <= 7:
                    engagement = "active"
            except Exception:
                pass

        if (
            inv["financials_time_ms"] >= 300000
            or qcount >= 3
            or session_count >= 2
            or inv["max_scroll_depth"] >= 100
        ):
            engagement = "hot"

        investors.append(InvestorSummary(
            investor_key=key,
            investor_label=label,
            last_viewed=inv["last_viewed"],
            total_time_ms=inv["total_time_ms"],
            question_count=qcount,
            session_count=session_count,
            max_scroll_depth=inv["max_scroll_depth"],
            financials_time_ms=inv["financials_time_ms"],
            engagement=engagement,
        ))

    # Sort: hot first, then active, then viewed; within tier by last_viewed desc
    tier_order = {"hot": 0, "active": 1, "viewed": 2}
    investors.sort(key=lambda i: (tier_order.get(i.engagement, 3), -(datetime.fromisoformat(i.last_viewed.replace("Z", "+00:00")).timestamp() if i.last_viewed else 0)))

    return AnalyticsSummaryResponse(investors=investors)


@router.get("/analytics/investor/{investor_key}")
async def get_investor_detail(
    investor_key: str,
    user: dict = Depends(get_current_user),
) -> InvestorDetail:
    """Return per-section time breakdown and question log for an investor."""
    founder_id = user["sub"]
    client = get_service_client()

    # Determine if investor_key is user_id or share_token_id
    # Try user first
    identity_filter = "user_id"
    try:
        u_check = client.table("users").select("id").eq("id", investor_key).single().execute()
        if u_check.data:
            identity_filter = "user_id"
    except Exception:
        identity_filter = "share_token_id"

    # Get section_time events
    section_events = (
        client.table("analytics_events")
        .select("section_id, duration_ms")
        .eq("founder_id", founder_id)
        .eq(identity_filter, investor_key)
        .eq("event_type", "section_time")
        .execute()
    )

    section_agg: dict[str, int] = {}
    for evt in (section_events.data or []):
        sid = evt.get("section_id", "unknown")
        section_agg[sid] = section_agg.get(sid, 0) + (evt.get("duration_ms") or 0)

    sections = [SectionTime(section_id=sid, duration_ms=ms) for sid, ms in section_agg.items()]

    # Get questions
    questions_result = (
        client.table("queries")
        .select("question, created_at")
        .eq(identity_filter, investor_key)
        .order("created_at", desc=True)
        .execute()
    )
    questions = [
        QuestionEntry(question=q["question"], created_at=q["created_at"])
        for q in (questions_result.data or [])
    ]

    return InvestorDetail(
        investor_key=investor_key,
        sections=sections,
        questions=questions,
    )


@router.get("/analytics/new-view-count")
async def get_new_view_count(
    since: str = Query(..., description="ISO timestamp of last analytics tab visit"),
    user: dict = Depends(get_current_user),
) -> NewViewCountResponse:
    """Count distinct new viewers since the given timestamp."""
    founder_id = user["sub"]
    client = get_service_client()

    result = (
        client.table("analytics_events")
        .select("user_id, share_token_id")
        .eq("founder_id", founder_id)
        .eq("event_type", "page_open")
        .gte("created_at", since)
        .execute()
    )

    # Count distinct identities
    identities: set[str] = set()
    for row in (result.data or []):
        key = row.get("user_id") or row.get("share_token_id")
        if key:
            identities.add(key)

    return NewViewCountResponse(count=len(identities))


@router.websocket("/analytics/founder-notifications")
async def founder_notification_ws(
    websocket: WebSocket,
    access_token: str | None = Query(None),
):
    """WebSocket channel for real-time founder notifications."""
    if not access_token:
        await websocket.close(code=4001)
        return

    # Validate JWT
    import jwt as pyjwt
    from app.core.config import settings

    try:
        try:
            payload = pyjwt.decode(
                access_token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except (pyjwt.InvalidSignatureError, pyjwt.InvalidAlgorithmError):
            import json as _json
            import httpx
            jwks = httpx.get(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json").json()
            public_key = pyjwt.algorithms.ECAlgorithm.from_jwk(_json.dumps(jwks["keys"][0]))
            payload = pyjwt.decode(
                access_token,
                public_key,
                algorithms=["ES256"],
                audience="authenticated",
            )
    except pyjwt.InvalidTokenError:
        await websocket.close(code=4001)
        return

    founder_id = payload["sub"]
    await websocket.accept()

    from app.api.v1.notifications import register_founder, unregister_founder

    await register_founder(founder_id, websocket)

    try:
        while True:
            await websocket.receive_text()  # keep-alive
    except WebSocketDisconnect:
        await unregister_founder(founder_id, websocket)
    except Exception:
        await unregister_founder(founder_id, websocket)
