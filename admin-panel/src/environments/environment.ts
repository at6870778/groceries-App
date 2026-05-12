const resolveApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8090/api';
  }

  const { hostname, protocol } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8090/api';
  }

  if (hostname === 'admin.orderkro.in' || hostname === 'orderkro.in' || hostname === 'www.orderkro.in') {
    return 'https://api.orderkro.in/api';
  }

  return `${protocol}//${hostname}:8090/api`;
};

export const environment = {
  production: false,
  apiUrl: resolveApiUrl()
};
