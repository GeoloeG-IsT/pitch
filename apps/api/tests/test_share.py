"""Share token tests -- stubs for Wave 0 Nyquist compliance.

Real assertions added as 06-03 Task 1 creates auth router with share token CRUD.
"""
import pytest


class TestGenerateLink:
    """AUTH-03: Shareable link generation."""

    @pytest.mark.skip(reason="Stub -- implement after 06-03 Task 1 creates share token endpoints")
    def test_generate_link(self):
        pass


class TestRevokeAccess:
    """AUTH-04: Access revocation."""

    @pytest.mark.skip(reason="Stub -- implement after 06-03 Task 1 creates revoke endpoint")
    def test_revoke_access(self):
        pass
