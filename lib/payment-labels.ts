const paymentMethodLabels: Record<string, string> = {
  on_delivery: "交貨付款",
  monthly: "月結",
  pay_later: "稍後付款",
  bank_transfer: "銀行轉賬",
  cash: "現金",
  fps: "轉數快",
  cheque: "支票",
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "未付款",
  paid: "已付款",
};

export function getPaymentMethodLabel(method: string | null | undefined) {
  if (!method) return "未設定";
  return paymentMethodLabels[method] || method;
}

export function getPaymentStatusLabel(status: string | null | undefined) {
  if (!status) return "未付款";
  return paymentStatusLabels[status] || status;
}
