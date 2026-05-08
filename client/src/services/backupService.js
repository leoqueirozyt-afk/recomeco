import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';

export const backupService = {
  async getLastBackup() {
    const { data, error } = await supabase
      .from('backup_logs')
      .select('*')
      .order('exported_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) return null;
    return data;
  },

  async checkPendingBackup(month, year) {
    const { data, error } = await supabase
      .from('backup_logs')
      .select('id')
      .eq('backup_month', month)
      .eq('backup_year', year)
      .maybeSingle();
    
    return !data;
  },

  async registerBackup(month, year, totalPeople, notes = '', exportedBy = '') {
    const { data, error } = await supabase
      .from('backup_logs')
      .insert({
        backup_month: month,
        backup_year: year,
        total_people: totalPeople,
        notes: notes,
        exported_by: exportedBy
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getPeopleWithMentors() {
    const { data: people, error } = await supabase
      .from('v_people_with_mentors')
      .select('*')
      .order('decision_date', { ascending: false });

    if (error) throw error;
    return people || [];
  },

  async exportCSV() {
    const people = await this.getPeopleWithMentors();

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
      person.decision_date || '',
      person.decision_month || '',
      person.full_name || '',
      person.birth_date || '',
      person.full_address || '',
      person.contact || '',
      person.gender || '',
      person.baptized ? 'Sim' : 'Não',
      person.first_decision || '',
      person.disciple_status || '',
      person.final_decision || '',
      person.mentors || '',
      person.notes || '',
      person.created_at || '',
      person.updated_at || ''
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
    const people = await this.getPeopleWithMentors();

    const data = people.map(person => ({
      'Data da decisão': person.decision_date || '',
      'Mês da decisão': person.decision_month || '',
      'Nome completo': person.full_name || '',
      'Data de nascimento': person.birth_date || '',
      'Endereço completo': person.full_address || '',
      'Contato': person.contact || '',
      'Sexo': person.gender || '',
      'Batizado': person.baptized ? 'Sim' : 'Não',
      'Primeira decisão': person.first_decision || '',
      'Status': person.disciple_status || '',
      'Decisão final': person.final_decision || '',
      'Responsáveis': person.mentors || '',
      'Observações': person.notes || '',
      'Data de criaç��o': person.created_at || '',
      'Data de atualização': person.updated_at || ''
    }));

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

    return wb;
  },

  downloadExcel(month, year) {
    const filename = `recomeco-backup-${String(month).padStart(2, '0')}-${year}.xlsx`;
    this.exportExcel().then(wb => {
      XLSX.writeFile(wb, filename);
    });
  }
};