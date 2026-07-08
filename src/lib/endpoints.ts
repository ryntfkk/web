export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  wallet: {
    balance: '/wallet/balance',
    transactions: '/wallet/transactions',
    topup: '/wallet/topup',
    withdraw: '/wallet/withdraw',
  },
  orders: {
    list: '/orders',
    detail: (id: string) => `/orders/${id}`,
    schedule: (id: string) => `/orders/${id}/schedule`,
    confirm: (id: string) => `/orders/${id}/confirm`,
    start: (id: string) => `/orders/${id}/start`,
    complete: (id: string) => `/orders/${id}/complete`,
    reject: (id: string) => `/orders/${id}/reject`,
    dispute: (id: string) => `/orders/${id}/dispute`,
    additionalFee: (id: string) => `/orders/${id}/additional-fees`,
    additionalFeeRespond: (orderId: string, feeId: string) => `/orders/${orderId}/additional-fees/${feeId}/respond`,
  },
  reviews: {
    create: '/reviews',
  },
  users: {
    profile: '/users/profile',
    addresses: '/users/addresses',
    notifications: '/users/notifications',
  }
};
