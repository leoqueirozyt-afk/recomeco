<<<<<<< Updated upstream
const API_BASE = import.meta.env.VITE_API_URL || 'https://recomeco-server.vercel.app';
=======
import { getApiBase } from './getApiBase';

const API_BASE = getApiBase();
>>>>>>> Stashed changes

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
    const res = await fetch(`${API_BASE}/api/people`);
    const people = await res.json();

    const headers = [
      'Data da decisão',
      'Mês da decisão',
      'Nome completo',
      'Data de nascimento',
      'Endereço completo',
      'Contato',
      'Sexo',
      'Batizado',
      'Primeira decisão',
      'Status',
      'Decisão final',
      'Responsáveis',
      'Observações',
      'Data de criação',
      'Data de atualização'
    ];

    const rows = people.map(person => [
      person.decisionDate || '',
      person.decisionMonth || '',
      person.fullName || '',
      person.birthDate || '',
      person.fullAddress || '',
      person.contact || '',
      person.gender || '',
      person.baptized || '',
      person.firstDecision || '',
      person.discipleStatus || '',
      person.finalDecision || '',
      person.mentors || '',
      person.notes || '',
      person.createdAt || '',
      person.updatedAt || ''
    ].map(val => String(val).replace(/"/g, '""')));

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    return csvContent;
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

  downloadExcel(month, year) {
    import('xlsx').then(XLSX => {
      this.exportExcel().then(({ data, filename }) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Backup');
        
        const colWidths = [
          { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 12 },
          { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
          { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
          { wch: 25 }, { wch: 20 }, { wch: 20 }
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `recomeco-backup-${String(month).padStart(2, '0')}-${year}.xlsx`);
      });
    });
  }
};