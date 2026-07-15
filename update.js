const fs = require('fs');
let content = fs.readFileSync('src/app/orders/[id]/Client.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import { Loader2 } from 'lucide-react';",
  "import { Loader2, Wallet, QrCode } from 'lucide-react';\nimport Script from 'next/script';"
);

// 2. Add state inside OrderDetailClient
content = content.replace(
  "const [isChatLoading, setIsChatLoading] = useState(false);",
  "const [isChatLoading, setIsChatLoading] = useState(false);\n  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online'|'wallet'>('online');\n  const [walletBalance, setWalletBalance] = useState(0);\n  const [isWalletDisabled, setIsWalletDisabled] = useState(false);\n  const [processingPayment, setProcessingPayment] = useState(false);"
);

// 3. Add fetchBalance and replace useEffect
content = content.replace(
  "  useEffect(() => {\n    if (!isAuthorized || !orderId) return;\n    fetchOrder();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [isAuthorized, orderId]);",
  "  const fetchBalance = async () => {\n    const res = await fetchAPI<{ data: { balance: number } }>('/wallet/balance');\n    if (res.success && res.data) {\n      const balance = (res.data as any).data?.balance ?? (res.data as any).balance ?? 0;\n      setWalletBalance(balance);\n    }\n  };\n\n  useEffect(() => {\n    if (!isAuthorized || !orderId) return;\n    fetchOrder();\n    fetchBalance();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [isAuthorized, orderId]);\n\n  useEffect(() => {\n    if (order && walletBalance < order.total_amount) {\n      setIsWalletDisabled(true);\n      if (selectedPaymentMethod === 'wallet') setSelectedPaymentMethod('online');\n    } else {\n      setIsWalletDisabled(false);\n    }\n  }, [walletBalance, order, selectedPaymentMethod]);"
);

// 4. Add handlePay
content = content.replace(
  "  const [cancelReason, setCancelReason] = useState('');",
  "  const [cancelReason, setCancelReason] = useState('');\n\n  const handlePay = async () => {\n    if (processingPayment || !order) return;\n    setProcessingPayment(true);\n\n    if (selectedPaymentMethod === 'wallet') {\n      if (isWalletDisabled) {\n        showToast('Saldo dompet tidak mencukupi.', 'error');\n        setProcessingPayment(false);\n        return;\n      }\n      const res = await fetchAPI(`/payments/initiate`, {\n        method: 'POST',\n        body: JSON.stringify({ order_id: orderId, payment_method: 'wallet_balance' })\n      });\n      if (res.success) {\n        showToast('Pembayaran berhasil!');\n        await fetchOrder();\n      } else {\n        showToast(getErrorMessage(res), 'error');\n      }\n      setProcessingPayment(false);\n      return;\n    }\n\n    const res = await fetchAPI<any>(`/payments/snap`, {\n      method: 'POST',\n      body: JSON.stringify({ order_id: orderId, payment_method: 'online' })\n    });\n    \n    const snapData = res.success ? unwrapData<any>(res.data) : null;\n    if (snapData?.token) {\n      const snap = (window as any).snap;\n      if (snap) {\n        snap.pay(snapData.token, {\n          onSuccess: async () => {\n            showToast('Pembayaran berhasil!');\n            await fetchOrder();\n            setProcessingPayment(false);\n          },\n          onPending: async () => {\n            showToast('Menunggu pembayaran diselesaikan.');\n            await fetchOrder();\n            setProcessingPayment(false);\n          },\n          onError: () => {\n            showToast('Pembayaran gagal.', 'error');\n            setProcessingPayment(false);\n          },\n          onClose: () => {\n            setProcessingPayment(false);\n          }\n        });\n      } else {\n        showToast('Sistem pembayaran belum siap.', 'error');\n        setProcessingPayment(false);\n      }\n    } else {\n      showToast(getErrorMessage(res), 'error');\n      setProcessingPayment(false);\n    }\n  };"
);

// 5. Add Script and UI
content = content.replace(
  "    <div className=\"page-h bg-[#f7f5f4] pb-24\">",
  "    <>\n      <Script \n        src=\"https://app.midtrans.com/snap/snap.js\"\n        data-client-key=\"Mid-client-YIpjEr3EZ2QSQcV2\"\n        strategy=\"afterInteractive\"\n      />\n    <div className=\"page-h bg-[#f7f5f4] pb-24\">"
);

// UI for Payment Methods right before Action Bar
content = content.replace(
  "      {/* Action Bar */}",
  "      {status === 'WAITING_PAYMENT' && (\n        <div className=\"max-w-3xl mx-auto px-4 mt-4\">\n          <div className=\"bg-white rounded border border-[#e5e2e1] p-4\">\n            <h2 className=\"text-sm font-semibold text-[#1c1b1b] mb-3\">Pilih Metode Pembayaran</h2>\n            <div className=\"space-y-3\">\n              <label className={`block p-3 rounded border cursor-pointer transition-colors ${selectedPaymentMethod === 'wallet' ? 'border-[#b51822] bg-[#FFF5F5]' : 'border-[#e5e2e1]'} ${isWalletDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>\n                <div className=\"flex items-center gap-3\">\n                  <input type=\"radio\" name=\"pm\" checked={selectedPaymentMethod === 'wallet'} disabled={isWalletDisabled} onChange={() => setSelectedPaymentMethod('wallet')} className=\"hidden\" />\n                  <div className={`w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center ${selectedPaymentMethod === 'wallet' ? 'border-[#b51822] bg-[#b51822]' : 'border-[#e5e2e1]'}`}>\n                    {selectedPaymentMethod === 'wallet' && <div className=\"w-1.5 h-1.5 rounded-full bg-white\" />}\n                  </div>\n                  <Wallet className={`w-5 h-5 ${selectedPaymentMethod === 'wallet' ? 'text-[#b51822]' : 'text-[#5b403e]'}`} />\n                  <div>\n                    <p className=\"font-medium text-sm text-[#1c1b1b]\">Saldo Dompet</p>\n                    <p className=\"text-xs text-[#9e8e8c]\">Saldo: {formatPrice(walletBalance)}</p>\n                  </div>\n                </div>\n              </label>\n              <label className={`block p-3 rounded border cursor-pointer transition-colors ${selectedPaymentMethod === 'online' ? 'border-[#b51822] bg-[#FFF5F5]' : 'border-[#e5e2e1]'}`}>\n                <div className=\"flex items-center gap-3\">\n                  <input type=\"radio\" name=\"pm\" checked={selectedPaymentMethod === 'online'} onChange={() => setSelectedPaymentMethod('online')} className=\"hidden\" />\n                  <div className={`w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center ${selectedPaymentMethod === 'online' ? 'border-[#b51822] bg-[#b51822]' : 'border-[#e5e2e1]'}`}>\n                    {selectedPaymentMethod === 'online' && <div className=\"w-1.5 h-1.5 rounded-full bg-white\" />}\n                  </div>\n                  <QrCode className={`w-5 h-5 ${selectedPaymentMethod === 'online' ? 'text-[#b51822]' : 'text-[#5b403e]'}`} />\n                  <div>\n                    <p className=\"font-medium text-sm text-[#1c1b1b]\">Pembayaran Online (Midtrans)</p>\n                    <p className=\"text-xs text-[#9e8e8c]\">QRIS, E-Wallet, Virtual Account</p>\n                  </div>\n                </div>\n              </label>\n            </div>\n          </div>\n        </div>\n      )}\n\n      {/* Action Bar */}"
);

// Replace button onClick
content = content.replace(
  "onClick={() => router.push(`/payment/${order.id}`)}",
  "onClick={handlePay}\n              disabled={processingPayment}"
);

content = content.replace(
  ">\n              Bayar Sekarang\n            </Button>",
  ">\n              {processingPayment ? 'Memproses...' : 'Bayar Sekarang'}\n            </Button>"
);

// Close Fragment at the very end
content = content.replace(
  "    </div>\n  );\n}",
  "    </div>\n    </>\n  );\n}"
);

fs.writeFileSync('src/app/orders/[id]/Client.tsx', content);
console.log('Updated orders/[id]/Client.tsx');
