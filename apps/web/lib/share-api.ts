import { getAuthHeaders } from '@/lib/api'

const API_BASE = '/api/v1'

export interface ShareToken {
  id: string
  token: string
  investor_email: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export async function createShareToken(
  expiryDays: number = 14,
  investorEmail?: string
): Promise<ShareToken> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/auth/share-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      expiry_days: expiryDays,
      investor_email: investorEmail || null,
    }),
  })
  if (!res.ok) throw new Error(`Failed to create share token: ${res.statusText}`)
  return res.json()
}

export async function listShareTokens(): Promise<ShareToken[]> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/auth/share-tokens`, { headers })
  if (!res.ok) throw new Error(`Failed to list share tokens: ${res.statusText}`)
  return res.json()
}

export async function revokeShareToken(tokenId: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/auth/share-tokens/${tokenId}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error(`Failed to revoke token: ${res.statusText}`)
}

export async function validateShareToken(
  token: string
): Promise<{ valid: boolean; token_id?: string; founder_id?: string }> {
  // Public endpoint -- no auth headers needed
  const res = await fetch(`${API_BASE}/auth/validate-token?token=${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error(`Token validation failed: ${res.statusText}`)
  return res.json()
}
