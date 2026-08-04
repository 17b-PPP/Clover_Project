declare module "thai-address-database" {
  export interface ThaiAddressEntry {
    district: string;
    amphoe: string;
    province: string;
    zipcode: string | number;
  }

  export function searchAddressByZipcode(
    searchStr: string,
    maxResult?: number
  ): ThaiAddressEntry[];
  export function searchAddressByDistrict(
    searchStr: string,
    maxResult?: number
  ): ThaiAddressEntry[];
  export function searchAddressByAmphoe(
    searchStr: string,
    maxResult?: number
  ): ThaiAddressEntry[];
  export function searchAddressByProvince(
    searchStr: string,
    maxResult?: number
  ): ThaiAddressEntry[];
}
