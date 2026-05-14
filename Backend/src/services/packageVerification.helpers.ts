import { OCRPackageDetails } from "../types/verification.types";

export function stripMarkdownCodeFences(value: string): string {
  return value
    .replace(/^```[\w-]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

export function isUsableText(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  const isNotVisiblePlaceholder = normalized.startsWith("not visible");
  return (
    normalized !== "" &&
    normalized !== "unknown" &&
    normalized !== "not provided" &&
    normalized !== "not specified" &&
    normalized !== "not available" &&
    normalized !== "n/a" &&
    !isNotVisiblePlaceholder
  );
}

export function normalizeExpiryCandidate(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function extractExpiryDate(text: string): string {
  const normalizedText = text.replace(/\s+/g, " ");
  const patterns = [
    /\b(?:exp(?:iry)?|exp\.?\s*date)\b[:\s-]*([0-9]{1,2}[\s/-][0-9]{2,4})\b/i,
    /\b(?:exp(?:iry)?|exp\.?\s*date)\b[:\s-]*([0-9]{4}[\s/-][0-9]{1,2})\b/i,
    /\b(?:exp(?:iry)?|exp\.?\s*date)\b[:\s-]*([A-Za-z]{3,9}\.??\s+[0-9]{4})\b/i,
    /\b([0-9]{1,2}[\s/-][0-9]{2,4})\b(?=\s*(?:exp(?:iry)?|exp\.?\s*date)\b)/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match?.[1]) {
      return normalizeExpiryCandidate(match[1]);
    }
  }

  const loosePatterns = [
    /\b[0-9]{1,2}\/[0-9]{2,4}\b/g,
    /\b[0-9]{4}\/[0-9]{1,2}\b/g,
    /\b[0-9]{1,2}-[0-9]{2,4}\b/g,
    /\b[A-Za-z]{3,9}\.??\s+[0-9]{4}\b/g,
  ];

  for (const pattern of loosePatterns) {
    const match = normalizedText.match(pattern);
    if (match?.[0]) {
      return normalizeExpiryCandidate(match[0]);
    }
  }

  return "";
}

export function extractNafdacNumber(text: string): string {
  const normalizedText = text.replace(/\s+/g, " ");
  const labeledMatch = normalizedText.match(
    /\b(?:nafdac(?:\s+reg(?:istration)?\.?\s*no\.?|\.?\s*reg\.?\s*no\.?)?)\b[:\s-]*([A-Z0-9][A-Z0-9\s-]{3,})/i,
  );

  const candidate =
    labeledMatch?.[1] ??
    normalizedText.match(/\b[A-Z0-9]{1,3}\s*-\s*[A-Z0-9]{2,6}\b/i)?.[0] ??
    "";
  if (!candidate) {
    return "";
  }

  return candidate
    .replace(/\s*[-]\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickFirstUsable(values: Array<unknown>): string {
  for (const value of values) {
    if (isUsableText(value)) {
      return value.trim();
    }
  }

  return "";
}

export function parseExpiryDate(expiryDate: string): Date | null {
  const normalized = expiryDate.trim().replace(/\s+/g, " ").toLowerCase();

  const monthNames = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  const monthNameMatch = normalized.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{4})$/,
  );
  if (monthNameMatch) {
    const monthIndex = monthNames.indexOf(monthNameMatch[1]);
    const year = parseInt(monthNameMatch[2], 10);
    if (monthIndex >= 0 && Number.isFinite(year)) {
      return new Date(year, monthIndex + 1, 0);
    }
  }

  const delimiterMatch = normalized.match(
    /^([0-9]{1,4})[\s\/\-.]([0-9]{1,4})$/,
  );
  if (!delimiterMatch) {
    return null;
  }

  const first = parseInt(delimiterMatch[1], 10);
  const second = parseInt(delimiterMatch[2], 10);

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  if (delimiterMatch[1].length === 4) {
    if (second < 1 || second > 12) {
      return null;
    }
    return new Date(first, second, 0);
  }

  if (first < 1 || first > 12) {
    return null;
  }

  const year = delimiterMatch[2].length === 2 ? 2000 + second : second;
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return null;
  }

  return new Date(year, first, 0);
}

function isUsableValue(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized !== "" &&
    normalized !== "n/a" &&
    normalized !== "not provided" &&
    normalized !== "not available" &&
    normalized !== "unknown"
  );
}

function normalizeNafdac(value: string): string {
  const trimmed = value.trim();
  const compact = trimmed.replace(/\s*[-]\s*/g, "-");
  return compact.replace(/\s+/g, " ");
}

function extractNafdacCandidate(value: unknown): string | null {
  if (!isUsableValue(value)) {
    return null;
  }

  const normalized = normalizeNafdac(value);

  const exactMatch = normalized.match(/\b\d{2}-\d{4}\b/);
  if (exactMatch?.[0]) {
    return exactMatch[0];
  }

  const spacedMatch = normalized.match(/\b\d{2}\s*-\s*\d{4}\b/);
  if (spacedMatch?.[0]) {
    return normalizeNafdac(spacedMatch[0]);
  }

  return null;
}

export function createEmptyPackageDetails(): OCRPackageDetails {
  return {
    drug_name: "",
    nafdac_reg_no: "",
    batch_number: "",
    expiry_date: "",
    manufacturer: "",
    barcode: "",
  };
}

export function mergeOCRResults(
  results: OCRPackageDetails[],
): OCRPackageDetails {
  const pickNafdac = (): string => {
    for (const result of results) {
      const candidate = extractNafdacCandidate(result.nafdac_reg_no);
      if (candidate) {
        return candidate;
      }
    }

    return "";
  };

  const pickBest = (field: keyof OCRPackageDetails): string => {
    const candidates = results
      .map((result) => result[field])
      .filter(isUsableValue);

    if (candidates.length === 0) {
      return "";
    }

    return candidates.reduce((first, second) =>
      first.length >= second.length ? first : second,
    );
  };

  return {
    drug_name: pickBest("drug_name"),
    nafdac_reg_no: pickNafdac(),
    batch_number: pickBest("batch_number"),
    expiry_date: pickBest("expiry_date"),
    manufacturer: pickBest("manufacturer"),
    barcode: pickBest("barcode"),
  };
}
