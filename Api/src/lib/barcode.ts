export const barcodeSymbologies = ["CODE128", "EAN13", "UPCA", "UPCE", "EAN8"] as const;
export type BarcodeSymbology = (typeof barcodeSymbologies)[number];

export function normalizeBarcode(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function hasValidMod10CheckDigit(value: string): boolean {
  if (!/^\d+$/.test(value) || value.length < 2) return false;
  const digits = value.split("").map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function expandUpce(value: string): string | null {
  if (!/^\d{8}$/.test(value) || !["0", "1"].includes(value.charAt(0))) return null;
  const numberSystem = value.charAt(0), d1 = value.charAt(1), d2 = value.charAt(2), d3 = value.charAt(3);
  const d4 = value.charAt(4), d5 = value.charAt(5), d6 = value.charAt(6), check = value.charAt(7);
  let body: string;
  if (["0", "1", "2"].includes(d6)) body = `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === "3") body = `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === "4") body = `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}`;
  else body = `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${body}${check}`;
}

export function validateBarcode(value: string, symbology: BarcodeSymbology): string | null {
  const normalized = normalizeBarcode(value);
  if (symbology === "CODE128") return /^[\x20-\x7E]{1,128}$/.test(normalized) ? null : "Code 128 must contain printable characters only.";
  if (symbology === "EAN13") return /^\d{13}$/.test(normalized) && hasValidMod10CheckDigit(normalized) ? null : "EAN-13 must contain 13 digits with a valid check digit.";
  if (symbology === "EAN8") return /^\d{8}$/.test(normalized) && hasValidMod10CheckDigit(normalized) ? null : "EAN-8 must contain 8 digits with a valid check digit.";
  if (symbology === "UPCA") return /^\d{12}$/.test(normalized) && hasValidMod10CheckDigit(normalized) ? null : "UPC-A must contain 12 digits with a valid check digit.";
  const expanded = expandUpce(normalized);
  return expanded && hasValidMod10CheckDigit(expanded) ? null : "UPC-E must contain 8 digits with a valid check digit.";
}

export function internalBarcodeCandidate(_productName = ""): string {
  const initial = String.fromCharCode(65 + randomInt(26));
  const letter = String.fromCharCode(65 + randomInt(26));
  const digits = randomInt(10_000).toString().padStart(4, "0");
  return `${initial}${letter}${digits}`;
}

/** A local, non-GS1 13 digit value to be encoded as Code 128. */
export function printableBarcodeCandidate(): string {
  let value = "";
  for (let index = 0; index < 13; index += 1) value += randomInt(10).toString();
  return value;
}
import { randomInt } from "node:crypto";
