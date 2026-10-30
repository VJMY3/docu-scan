import { Camera, Cloud, HardDrive } from 'lucide-react';
import type { DashboardStats } from '../../types/document';

interface StatsOverviewProps {
  stats: DashboardStats;
  syncedCount?: number;
}

export const StatsOverview = ({ stats, syncedCount = 0 }: StatsOverviewProps) => {
  const localOnlyCount = Math.max(0, stats.totalScans - syncedCount);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '16px' }}>
        <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '0.85rem', borderRadius: '12px' }}>
          <Camera color="var(--primary-color)" size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Total Snapshots</p>
          <h3 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 700 }}>{stats.totalScans}</h3>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '16px' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.85rem', borderRadius: '12px' }}>
          <Cloud color="var(--success-color)" size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Synced to Supabase</p>
          <h3 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 700, color: 'var(--success-color)' }}>{syncedCount}</h3>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '16px' }}>
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.85rem', borderRadius: '12px' }}>
          <HardDrive color="var(--warning-color)" size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Local Cache</p>
          <h3 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 700, color: 'var(--warning-color)' }}>{localOnlyCount}</h3>
        </div>
      </div>

    </div>
  );
};
