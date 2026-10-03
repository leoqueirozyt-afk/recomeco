export function getApiBase() {
  // Workers + Assets: frontend e API servidos pela mesma origem (caminhos
  // relativos /api/*). VITE_API_URL só é necessário para apontar a outro host.
  return import.meta.env.VITE_API_URL || '';
}
