import { Camera, Cloud, Database } from 'lucide-react';
import type { DashboardStats } from '../../types/document';

interface StatsOverviewProps {
  stats: DashboardStats;
}

export const StatsOverview = ({ stats }: StatsOverviewProps) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      
      {/* Total Scans */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '16px' }}>
        <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '0.85rem', borderRadius: '12px' }}>
          <Camera color="var(--primary-color)" size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Total Supabase Scans</p>
          <h3 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 700 }}>{stats.totalScans}</h3>
        </div>
      </div>

      {/* Supabase Storage Bucket */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '16px' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.85rem', borderRadius: '12px' }}>
          <Cloud color="var(--success-color)" size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Supabase Storage</p>
          <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: 'var(--success-color)' }}>
            'scans' Bucket Active
          </h3>
        </div>
      </div>

      {/* Supabase Database Connection */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '16px' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.85rem', borderRadius: '12px' }}>
          <Database color="#60a5fa" size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Database Engine</p>
          <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: '#60a5fa' }}>
            Supabase PostgreSQL
          </h3>
        </div>
      </div>

    </div>
  );
};
