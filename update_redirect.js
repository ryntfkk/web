const fs = require('fs');
let content = fs.readFileSync('src/app/orders/[id]/Client.tsx', 'utf8');

const target = `    const snapData = res.success ? unwrapData<any>(res.data) : null;
    if (snapData?.token) {
      const snap = (window as any).snap;
      if (snap) {
        snap.pay(snapData.token, {
          onSuccess: async () => {
            showToast('Pembayaran berhasil!');
            await fetchOrder();
            setProcessingPayment(false);
          },
          onPending: async () => {
            showToast('Menunggu pembayaran diselesaikan.');
            await fetchOrder();
            setProcessingPayment(false);
          },
          onError: () => {
            showToast('Pembayaran gagal.', 'error');
            setProcessingPayment(false);
          },
          onClose: () => {
            setProcessingPayment(false);
          }
        });
      } else {
        showToast('Sistem pembayaran belum siap.', 'error');
        setProcessingPayment(false);
      }
    } else {
      showToast(getErrorMessage(res), 'error');
      setProcessingPayment(false);
    }`;

const replacement = `    const snapData = res.success ? unwrapData<any>(res.data) : null;
    if (snapData?.redirect_url) {
      // Bypass popup iframe constraints and redirect directly to Midtrans secure payment page
      window.location.href = snapData.redirect_url;
    } else if (snapData?.token) {
      const snap = (window as any).snap;
      if (snap) {
        snap.pay(snapData.token, {
          onSuccess: async () => {
            showToast('Pembayaran berhasil!');
            await fetchOrder();
            setProcessingPayment(false);
          },
          onPending: async () => {
            showToast('Menunggu pembayaran diselesaikan.');
            await fetchOrder();
            setProcessingPayment(false);
          },
          onError: () => {
            showToast('Pembayaran gagal.', 'error');
            setProcessingPayment(false);
          },
          onClose: () => {
            setProcessingPayment(false);
          }
        });
      } else {
        showToast('Sistem pembayaran belum siap.', 'error');
        setProcessingPayment(false);
      }
    } else {
      showToast(getErrorMessage(res), 'error');
      setProcessingPayment(false);
    }`;

content = content.replace(target, replacement);

fs.writeFileSync('src/app/orders/[id]/Client.tsx', content);
console.log('Successfully updated Client.tsx to use redirect_url');
