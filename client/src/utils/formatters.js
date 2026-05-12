export function onlyNumbers(value) {
  return String(value || '').replace(/\D/g, '');
}

export function unmask(value) {
  return onlyNumbers(value);
}

export function formatPhone(value) {
  const nums = onlyNumbers(value);
  if (nums.length === 0) return '';
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 11) {
    if (nums.length === 11) {
      return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
    }
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  }
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
}

export function formatCPF(value) {
  const nums = onlyNumbers(value);
  if (nums.length === 0) return '';
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
}

export function formatCEP(value) {
  const nums = onlyNumbers(value);
  if (nums.length === 0) return '';
  if (nums.length <= 5) return nums;
  return `${nums.slice(0, 5)}-${nums.slice(5, 8)}`;
}

export function validatePhone(value) {
  const nums = onlyNumbers(value);
  return nums.length >= 10;
}

export function validateCPF(value) {
  const nums = onlyNumbers(value);
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== parseInt(nums[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== parseInt(nums[10])) return false;

  return true;
}

export function validateCEP(value) {
  return onlyNumbers(value).length === 8;
}

export function formatPhoneDisplay(value) {
  const nums = onlyNumbers(value);
  if (nums.length === 11) {
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  }
  if (nums.length === 10) {
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  }
  return value;
}
