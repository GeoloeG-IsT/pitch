'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HealthData {
  status: 'healthy' | 'degraded';
  frontend: 'ok';
  backend: 'ok' | 'degraded' | 'unreachable';
  database: 'ok' | 'unreachable';
  timestamp: string;
}

type ServiceStatus = 'ok' | 'degraded' | 'unreachable';

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === 'ok') {
    return (
      <Badge className="bg-green-500 text-white hover:bg-green-500">
        Healthy
      </Badge>
    );
  }
  if (status === 'degraded') {
    return (
      <Badge className="bg-yellow-500 text-black hover:bg-yellow-500">
        Degraded
      </Badge>
    );
  }
  return (
    <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">
      Unreachable
    </Badge>
  );
}

function getSummaryMessage(health: HealthData): string {
  const downCount = [health.backend, health.database].filter(
    (s) => s === 'unreachable'
  ).length;
  const degradedCount = [health.backend, health.database].filter(
    (s) => s === 'degraded'
  ).length;

  if (downCount >= 2) {
    return 'Multiple services are down. Run `turbo dev` and `supabase start` to start all services.';
  }
  if (downCount > 0 || degradedCount > 0) {
    return 'Some services are not responding. Check that all services are running.';
  }
  return 'All systems operational';
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch(() => {
        setHealth({
          status: 'degraded',
          frontend: 'ok',
          backend: 'unreachable',
          database: 'unreachable',
          timestamp: new Date().toISOString(),
        });
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-[480px] px-4">
        <div className="pt-16 pb-16">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-[28px] font-semibold leading-[1.2] text-primary">
              Zeee Pitch Zooo
            </h1>
            <p className="text-sm text-muted-foreground">System Status</p>
          </div>

          {/* Service Cards */}
          <div className="mt-8 space-y-2">
            {loading ? (
              <>
                <div className="animate-pulse bg-muted rounded h-[52px]" />
                <div className="animate-pulse bg-muted rounded h-[52px]" />
                <div className="animate-pulse bg-muted rounded h-[52px]" />
              </>
            ) : health ? (
              <>
                <Card className="flex flex-row justify-between items-center p-4">
                  <span className="text-base">Frontend</span>
                  <StatusBadge status="ok" />
                </Card>
                <Card className="flex flex-row justify-between items-center p-4">
                  <span className="text-base">Backend API</span>
                  <StatusBadge status={health.backend} />
                </Card>
                <Card className="flex flex-row justify-between items-center p-4">
                  <span className="text-base">Supabase</span>
                  <StatusBadge status={health.database} />
                </Card>
              </>
            ) : null}
          </div>

          {/* Summary Message */}
          {health && (
            <p className="mt-6 text-center text-muted-foreground">
              {getSummaryMessage(health)}
            </p>
          )}

          {/* Footer */}
          <p className="mt-16 text-sm text-muted-foreground text-center">
            Phase 1 -- Foundation
          </p>
        </div>
      </div>
    </div>
  );
}
