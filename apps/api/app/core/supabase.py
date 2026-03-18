from supabase import create_client, Client

from app.core.config import settings


def get_service_client() -> Client:
    """Return a Supabase client using the service role key.

    The service role key bypasses RLS, which is required for backend
    write operations (INSERT/UPDATE/DELETE on documents and chunks).
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
