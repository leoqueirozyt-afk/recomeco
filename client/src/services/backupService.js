const API_BASE = (() => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) return configuredUrl;

  const origin = window.location.origin;

  if (origin.includes('.vercel.app') && !origin.includes('recomeco-nu') && !origin.includes('recomeco-server')) {
    if (origin.startsWith('https://recomeco-git-')) {
      return origin.replace('https://recomeco-git-', 'https://recomeco-api-git-');
    }
  }

  return 'https://recomeco-server.vercel.app';
})();

export const backupService = {
  async getLastBackup() {
    const res = await fetch(`${API_BASE}/api/backups/status`);
    const data = await res.json();
    return data.lastBackup || null;
  },

  async checkPendingBackup(month, year) {
    const res = await fetch(`${API_BASE}/api/backups/status`);
    const data = await res.json();
    return data.pendingAlert || false;
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

  downloadCSV(content, month, year) {
    const filename = `recomeco-backup-${String(month).padStart(2, '0')}-${year}.csv`;
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  async exportExcel() {
    const res = await fetch(`${API_BASE}/api/people`);
    const people = await res.json();

    const data = people.map(person => ({
      'Data da decisão': person.decisionDate || '',
      'Mês da decisão': person.decisionMonth || '',
      'Nome completo': person.fullName || '',
      'Data de nascimento': person.birthDate || '',
      'Endereço completo': person.fullAddress || '',
      'Contato': person.contact || '',
      'Sexo': person.gender || '',
      'Batizado': person.baptized || '',
      'Primeira decisão': person.firstDecision || '',
      'Status': person.discipleStatus || '',
      'Decisão final': person.finalDecision || '',
      'Responsáveis': person.mentors || '',
      'Observações': person.notes || '',
      'Data de criação': person.createdAt || '',
      'Data de atualização': person.updatedAt || ''
    }));

    return { data, filename: 'Backup' };
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
  }
};