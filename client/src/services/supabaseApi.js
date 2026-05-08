// API usando Supabase
import { supabase } from './supabaseClient';

function mapPerson(row) {
  return {
    id: row.id,
    decisionDate: row.decision_date,
    decisionMonth: row.decision_month,
    fullName: row.full_name,
    birthDate: row.birth_date,
    fullAddress: row.full_address,
    contact: row.contact,
    gender: row.gender,
    baptized: row.baptized ? 'Sim' : 'Não',
    firstDecision: row.first_decision,
    discipleStatus: row.disciple_status,
    finalDecision: row.final_decision,
    photo: null,
    notes: row.notes,
    mentors: row.mentors || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMentor(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    notes: row.notes,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const supabaseApi = {
  // === PEOPLE ===
  async getPeople() {
    const { data, error } = await supabase
      .from('v_people_with_mentors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapPerson);
  },

  async getPerson(id) {
    const { data, error } = await supabase
      .from('v_people_with_mentors')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return mapPerson(data);
  },

  async createPerson(data) {
    const personData = {
      decision_date: data.decisionDate || null,
      decision_month: data.decisionMonth || null,
      full_name: data.fullName,
      birth_date: data.birthDate || null,
      full_address: data.fullAddress || null,
      contact: data.contact || null,
      gender: data.gender || null,
      baptized: data.baptized === 'Sim',
      first_decision: data.firstDecision || null,
      disciple_status: data.discipleStatus || 'Em cuidado',
      final_decision: data.finalDecision || 'Em acompanhamento',
      notes: data.notes || null,
      photo: null
    };

    const { data: person, error } = await supabase
      .from('people')
      .insert(personData)
      .select()
      .single();
    
    if (error) throw error;

    // Se tiver mentores, cria o relacionamento
    if (data.mentorIds && data.mentorIds.length > 0) {
      const mentorLinks = data.mentorIds.map(mentorId => ({
        person_id: person.id,
        mentor_id: mentorId
      }));
      
      const { error: linkError } = await supabase
        .from('people_mentors')
        .insert(mentorLinks);
      
      if (linkError) console.error('Erro ao vincular mentores:', linkError);
    }

    return person.id;
  },

  async updatePerson(id, data) {
    const personData = {
      decision_date: data.decisionDate || null,
      decision_month: data.decisionMonth || null,
      full_name: data.fullName,
      birth_date: data.birthDate || null,
      full_address: data.fullAddress || null,
      contact: data.contact || null,
      gender: data.gender || null,
      baptized: data.baptized === 'Sim',
      first_decision: data.firstDecision || null,
      disciple_status: data.discipleStatus || 'Em cuidado',
      final_decision: data.finalDecision || 'Em acompanhamento',
      notes: data.notes || null
    };

    const { error } = await supabase
      .from('people')
      .update(personData)
      .eq('id', id);
    
    if (error) throw error;

    // Remove Links antigos e cria novos
    await supabase.from('people_mentors').delete().eq('person_id', id);
    
    if (data.mentorIds && data.mentorIds.length > 0) {
      const mentorLinks = data.mentorIds.map(mentorId => ({
        person_id: id,
        mentor_id: mentorId
      }));
      
      await supabase.from('people_mentors').insert(mentorLinks);
    }
  },

  async deletePerson(id) {
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // === MENTORS ===
  async getMentors() {
    const { data, error } = await supabase
      .from('mentors')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapMentor);
  },

  async getMentor(id) {
    const { data, error } = await supabase
      .from('mentors')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return mapMentor(data);
  },

  async createMentor(data) {
    const { data: mentor, error } = await supabase
      .from('mentors')
      .insert({
        full_name: data.fullName,
        phone: data.phone || null,
        notes: data.notes || null,
        active: data.active !== false
      })
      .select()
      .single();
    
    if (error) throw error;
    return mentor.id;
  },

  async updateMentor(id, data) {
    const { error } = await supabase
      .from('mentors')
      .update({
        full_name: data.fullName,
        phone: data.phone || null,
        notes: data.notes || null,
        active: data.active !== false
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteMentor(id) {
    const { error } = await supabase
      .from('mentors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // === DASHBOARD ===
  async getDashboard() {
    const { data: people, error } = await supabase
      .from('people')
      .select('*');
    
    if (error) throw error;

    const all = people || [];
    const total = all.length;
    const inCare = all.filter(p => p.disciple_status === 'Em cuidado').length;
    const awaitingDecision = all.filter(p => p.disciple_status === 'Aguardando decisão').length;
    const disciple = all.filter(p => p.disciple_status === 'Discípulo').length;
    const visitor = all.filter(p => p.disciple_status === 'Visitante').length;
    const baptized = all.filter(p => p.baptized).length;
    const notBaptized = all.filter(p => !p.baptized).length;

    // Buscar people sem mentor
    const { data: noMentorLinks } = await supabase
      .from('people_mentors')
      .select('person_id');
    
    const peopleWithMentor = new Set(noMentorLinks?.map(l => l.person_id) || []);
    const withoutMentor = all.filter(p => !peopleWithMentor.has(p.id)).length;

    // Buscar recent people
    const { data: recentPeople } = await supabase
      .from('people')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Buscar recent decisions
    const { data: recentDecisions } = await supabase
      .from('people')
      .select('*')
      .not('decision_date', 'is', null)
      .order('decision_date', { ascending: false })
      .limit(5);

    // Agrupamentos
    const byStatus = Object.entries(
      all.reduce((acc, p) => {
        acc[p.disciple_status] = (acc[p.disciple_status] || 0) + 1;
        return acc;
      }, {})
    ).map(([status, count]) => ({ status, count }));

    const byMonth = Object.entries(
      all.reduce((acc, p) => {
        if (p.decision_month) {
          acc[p.decision_month] = (acc[p.decision_month] || 0) + 1;
        }
        return acc;
      }, {})
    ).map(([month, count]) => ({ month, count }));

    const byFirstDecision = Object.entries(
      all.reduce((acc, p) => {
        if (p.first_decision) {
          acc[p.first_decision] = (acc[p.first_decision] || 0) + 1;
        }
        return acc;
      }, {})
    ).map(([decision, count]) => ({ decision, count }));

    const byGender = Object.entries(
      all.reduce((acc, p) => {
        if (p.gender) {
          acc[p.gender] = (acc[p.gender] || 0) + 1;
        }
        return acc;
      }, {})
    ).map(([gender, count]) => ({ gender, count }));

    return {
      total,
      inCare,
      awaitingDecision,
      disciple,
      visitor,
      baptized,
      notBaptized,
      withoutMentor,
      byStatus,
      byMonth,
      byFirstDecision,
      byGender,
      recentPeople: (recentPeople || []).map(mapPerson),
      recentDecisions: (recentDecisions || []).map(p => ({
        id: p.id,
        fullName: p.full_name,
        firstDecision: p.first_decision,
        decisionDate: p.decision_date
      }))
    };
  }
};

export default supabaseApi;