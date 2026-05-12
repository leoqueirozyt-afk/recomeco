import { onlyNumbers } from '../utils/formatters';

export async function fetchAddressByCEP(cep) {
  const clean = onlyNumbers(cep);

  if (clean.length !== 8) {
    return { error: 'CEP deve ter 8 dígitos.' };
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) {
      return { error: 'Não foi possível buscar o CEP agora. Preencha o endereço manualmente.' };
    }

    const data = await res.json();

    if (data.erro) {
      return { error: 'CEP não encontrado. Preencha o endereço manualmente.' };
    }

    return {
      cep: data.cep || clean,
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || ''
    };
  } catch {
    return { error: 'Não foi possível buscar o CEP agora. Preencha o endereço manualmente.' };
  }
}

export function formatFullAddress({ zipCode, street, number, complement, neighborhood, city, state }) {
  const parts = [];
  if (zipCode) parts.push(`CEP: ${zipCode}`);
  if (street || number || complement) {
    let addr = street || '';
    if (number) addr += `, ${number}`;
    if (complement) addr += `, ${complement}`;
    if (zipCode) addr += ` | CEP: ${zipCode}`;
    parts.push(addr);
  } else if (zipCode) {
    parts.push(`CEP: ${zipCode}`);
  }
  if (neighborhood) parts.push(`Bairro: ${neighborhood}`);
  if (city || state) {
    const cs = [city, state].filter(Boolean).join('/');
    if (cs) parts.push(`Cidade: ${cs}`);
  }
  return parts.join(' | ');
}
