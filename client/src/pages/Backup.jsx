import { useState, useEffect, useRef } from 'react';
import { backupService } from '../services/backupService';
import { Link } from 'react-router-dom';

function Backup() {
  const [lastBackup, setLastBackup] = useState(null);
  const [pendingAlert, setPendingAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    checkBackupStatus();
  }, []);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.frequency.value = 1100;
        oscillator.start();
      }, 150);
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 300);
    } catch (e) {
      console.log('Erro ao reproduzir som:', e);
    }
  };

  const checkBackupStatus = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const last = await backupService.getLastBackup();
      setLastBackup(last);

      const isPending = await backupService.checkPendingBackup(currentMonth, currentYear);
      setPendingAlert(isPending);

      if (isPending) {
        playNotificationSound();
      }
    } catch (error) {
      console.error('Erro ao verificar backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await backupService.exportCSV();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      backupService.downloadCSV(blob, month, year);
      alert('Backup CSV exportado com sucesso! Agora registre o backup.');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      
      await backupService.downloadExcel(month, year);
      alert('Backup Excel exportado com sucesso! Agora registre o backup.');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleRegisterBackup = async () => {
    const confirmed = window.confirm(
      'Você já exportou e salvou o backup deste mês em local seguro?'
    );

    if (!confirmed) return;

    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      await backupService.registerBackup(month, year, 0, 'Backup manual');
      await checkBackupStatus();
      alert('Backup registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar:', error);
      alert('Erro ao registrar: ' + error.message);
    }
  };

  const handleExportVisitorsCSV = async () => {
    setExporting(true);
    try {
      const blob = await backupService.exportVisitorsCSV();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      backupService.downloadVisitorsCSV(blob, month, year);
      alert('Backup de visitantes exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportVisitorsExcel = async () => {
    setExporting(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const blob = await backupService.exportVisitorsExcel();
      backupService.downloadVisitorsExcel(blob, month, year);
      alert('Backup de visitantes exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportMembersCSV = async () => {
    setExporting(true);
    try {
      const blob = await backupService.exportMembersCSV();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      backupService.downloadMembersCSV(blob, month, year);
      alert('Backup de membros exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportBirthdaysCSV = async () => {
    setExporting(true);
    try {
      const blob = await backupService.exportBirthdaysCSV();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      backupService.downloadBirthdaysCSV(blob, month, year);
      alert('Backup de aniversariantes exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="empty-state">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Backup Mensal</h1>
        <p className="page-subtitle">Exporte e registre seus dados mensalmente</p>
      </div>

      {pendingAlert && (
        <div 
          className="alert alert-warning" 
          onClick={playNotificationSound}
          style={{
            background: 'linear-gradient(135deg, #dc143c 0%, #a01030 100%)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: 'var(--radius)',
            marginBottom: '24px',
            fontWeight: '600',
            cursor: 'pointer',
            animation: 'pulse 2s infinite',
            boxShadow: '0 0 20px rgba(220, 20, 60, 0.5)'
          }}
        >
          🔔⚠️ Backup mensal pendente! Clique aqui e exporte.
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>Último Backup</h3>
        {lastBackup ? (
          <div style={{ fontSize: '16px' }}>
            <p><strong>Data:</strong> {new Date(lastBackup.exported_at).toLocaleDateString('pt-BR')}</p>
            <p><strong>Mês:</strong> {lastBackup.backup_month}/{lastBackup.backup_year}</p>
            <p><strong>Pessoas:</strong> {lastBackup.total_people}</p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-light)' }}>Nenhum backup registrado</p>
        )}
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">CSV</div>
          <button
            className="btn btn-primary"
            onClick={handleExportCSV}
            disabled={exporting}
            style={{ marginTop: '12px', width: '100%' }}
          >
            {exporting ? 'Exportando...' : '📄 Exportar CSV'}
          </button>
        </div>
        <div className="stat-card">
          <div className="stat-label">Excel</div>
          <button
            className="btn btn-primary"
            onClick={handleExportExcel}
            disabled={exporting}
            style={{ marginTop: '12px', width: '100%' }}
          >
            {exporting ? 'Exportando...' : '📊 Exportar Excel'}
          </button>
        </div>
        <div className="stat-card">
          <div className="stat-label">Registro</div>
          <button
            className="btn btn-secondary"
            onClick={handleRegisterBackup}
            style={{ marginTop: '12px', width: '100%' }}
          >
            ✓ Registrar Backup
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Exportar Visitantes</h3>
        <div className="btn-group">
          <button
            className="btn btn-secondary"
            onClick={handleExportVisitorsCSV}
            disabled={exporting}
          >
            📄 CSV Visitantes
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportVisitorsExcel}
            disabled={exporting}
          >
            📊 Excel Visitantes
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Exportar Membros</h3>
        <div className="btn-group">
          <button
            className="btn btn-secondary"
            onClick={handleExportMembersCSV}
            disabled={exporting}
          >
            📄 CSV Membros
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportBirthdaysCSV}
            disabled={exporting}
          >
            🎂 CSV Aniversariantes
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Como fazer o backup?</h3>
        <ol style={{ paddingLeft: '20px', lineHeight: '2' }}>
          <li>Clique em "Exportar CSV" ou "Exportar Excel"</li>
          <li>Abra o arquivo no Excel ou Google Sheets</li>
          <li>Salve uma cópia em local seguro (Google Drive, HD)</li>
          <li>Clique em "Registrar Backup"</li>
        </ol>
      </div>
    </div>
  );
}

export default Backup;