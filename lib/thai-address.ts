import { searchAddressByZipcode } from "thai-address-database";

export interface PostalCodeMatch {
  amphoe: string;
  province: string;
}

export function lookupPostalCode(postalCode: string): PostalCodeMatch[] {
  if (!/^[0-9]{5}$/.test(postalCode)) return [];

  const entries = searchAddressByZipcode(`^${postalCode}$`, 50);

  const seen = new Set<string>();
  const results: PostalCodeMatch[] = [];
  for (const entry of entries) {
    const key = `${entry.amphoe}|${entry.province}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ amphoe: entry.amphoe, province: entry.province });
  }
  return results;
}
