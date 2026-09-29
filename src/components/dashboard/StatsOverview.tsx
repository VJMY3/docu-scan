import { FileText, Activity } from 'lucide-react';
import type { DashboardStats } from '../../types/document';

interface StatsOverviewProps {
  stats: DashboardStats;
}

export const StatsOverview = ({ stats }: StatsOverviewProps) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
      
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '12px' }}>
          <FileText color="var(--primary-color)" size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Scans</p>
          <h3 style={{ fontSize: '1.5rem', margin: '0' }}>{stats.totalScans}</h3>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '1rem', borderRadius: '12px' }}>
          <Activity color="var(--warning-color)" size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Pending Verification</p>
          <h3 style={{ fontSize: '1.5rem', margin: '0' }}>{stats.pendingCount}</h3>
        </div>
      </div>

    </div>
  );
};
