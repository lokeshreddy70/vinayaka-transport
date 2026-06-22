export const toCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value);
};

export const generateTrackingNumber = (): string => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9000 + 1000).toString();
  return `PT${stamp}${random}`;
};
