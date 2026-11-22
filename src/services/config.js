const runtimeBase = typeof window !== 'undefined' && window.PLOTCRAFT_API_BASE;
const fallbackBase = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000';

export const API_BASE = import.meta.env?.VITE_API_URL || runtimeBase || fallbackBase;
export default API_BASE;