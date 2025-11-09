// Countries and their states/provinces for AHJ selection

export const COUNTRIES = ['USA', 'Australia', 'Canada'] as const;
export type Country = typeof COUNTRIES[number];

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
] as const;

export const AUSTRALIA_STATES = [
  'Australian Capital Territory',
  'New South Wales',
  'Northern Territory',
  'Queensland',
  'South Australia',
  'Tasmania',
  'Victoria',
  'Western Australia'
] as const;

export const CANADA_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon'
] as const;

export type USState = typeof US_STATES[number];
export type AustraliaState = typeof AUSTRALIA_STATES[number];
export type CanadaProvince = typeof CANADA_PROVINCES[number];
export type StateOrProvince = USState | AustraliaState | CanadaProvince;

export const COUNTRY_STATES: Record<Country, readonly string[]> = {
  'USA': US_STATES,
  'Australia': AUSTRALIA_STATES,
  'Canada': CANADA_PROVINCES,
};

export function getStatesForCountry(country: Country | string | null | undefined): readonly string[] {
  if (!country || !COUNTRIES.includes(country as Country)) {
    return []; // Return empty array if no valid country
  }
  return COUNTRY_STATES[country as Country];
}

