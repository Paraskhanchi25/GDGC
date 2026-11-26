export function formatINR(amountMinor: number): string {
  const sign = amountMinor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amountMinor));
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;

  const formattedRupees = new Intl.NumberFormat("en-IN").format(rupees);
  if (paise === 0) {
    return `${sign}₹${formattedRupees}`;
  }
  return `${sign}₹${formattedRupees}.${String(paise).padStart(2, "0")}`;
}

export function paiseToRupees(amountMinor: number): number {
  return Math.round(amountMinor) / 100;
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === "string" ? parseFloat(rupees.replace(/,/g, "").trim()) : rupees;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}
