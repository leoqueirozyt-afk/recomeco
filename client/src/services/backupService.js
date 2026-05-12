import { getApiBase } from './getApiBase';

const API_BASE = getApiBase();

export const backupService = {
  async getLastBackup() {
    try {
      const res = await fetch(`${API_BASE}/api/backups/status`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.lastBackup || null;
    } catch {
      return null;
    }
  },

  async checkPendingBackup(month, year) {
    try {
      const res = await fetch(`${API_BASE}/api/backups/status`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.pendingAlert || false;
    } catch {
      return false;
    }
  },

  async registerBackup(month, year, totalPeople, notes = '', exportedBy = '') {
    const res = await fetch(`${API_BASE}/api/backups/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backup_month: month, backup_year: year, total_people: totalPeople, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao registrar');
    return data;
  },

  async exportCSV() {
    const res = await fetch(`${API_BASE}/api/backups/export/csv`);
    if (!res.ok) throw new Error('Erro ao exportar CSV');
    return res.blob();
  },

  downloadCSV(blob, month, year) {
    const filename = `recomeco-acompanhamento-${String(month).padStart(2, '0')}-${year}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  async exportVisitorsCSV() {
    const res = await fetch(`${API_BASE}/api/backups/export/visitors/csv`);
    if (!res.ok) throw new Error('Erro ao exportar visitantes');
    return res.blob();
  },

  downloadVisitorsCSV(blob, month, year) {
    const filename = `recomeco-visitantes-${String(month).padStart(2, '0')}-${year}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  async exportVisitorsExcel() {
    const res = await fetch(`${API_BASE}/api/backups/export/xlsx`);
    if (!res.ok) throw new Error('Erro ao exportar Excel');
    return res.blob();
  },

  downloadVisitorsExcel(blob, month, year) {
    const filename = `recomeco-backup-${String(month).padStart(2, '0')}-${year}.xlsx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  downloadExcel(month, year) {
    this.exportVisitorsExcel().then(blob => {
      this.downloadVisitorsExcel(blob, month, year);
    });
  },

  async exportMembersCSV() {
    const res = await fetch(`${API_BASE}/api/backups/export/members/csv`);
    if (!res.ok) throw new Error('Erro ao exportar membros');
    return res.blob();
  },

  downloadMembersCSV(blob, month, year) {
    const filename = `recomeco-membros-${String(month).padStart(2, '0')}-${year}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  async exportBirthdaysCSV() {
    const res = await fetch(`${API_BASE}/api/backups/export/birthdays/csv`);
    if (!res.ok) throw new Error('Erro ao exportar aniversariantes');
    return res.blob();
  },

  downloadBirthdaysCSV(blob, month, year) {
    const filename = `recomeco-aniversariantes-${String(month).padStart(2, '0')}-${year}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
};
