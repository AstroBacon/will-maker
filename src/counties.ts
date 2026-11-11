import type { StateCode } from './types';

/** Every county in each supported state. Georgia has 159; Oregon has 36. */
export const COUNTIES: Record<StateCode, string[]> = {
  GA: [
    'Appling', 'Atkinson', 'Bacon', 'Baker', 'Baldwin', 'Banks', 'Barrow', 'Bartow', 'Ben Hill', 'Berrien',
    'Bibb', 'Bleckley', 'Brantley', 'Brooks', 'Bryan', 'Bulloch', 'Burke', 'Butts', 'Calhoun', 'Camden',
    'Candler', 'Carroll', 'Catoosa', 'Charlton', 'Chatham', 'Chattahoochee', 'Chattooga', 'Cherokee', 'Clarke', 'Clay',
    'Clayton', 'Clinch', 'Cobb', 'Coffee', 'Colquitt', 'Columbia', 'Cook', 'Coweta', 'Crawford', 'Crisp',
    'Dade', 'Dawson', 'Decatur', 'DeKalb', 'Dodge', 'Dooly', 'Dougherty', 'Douglas', 'Early', 'Echols',
    'Effingham', 'Elbert', 'Emanuel', 'Evans', 'Fannin', 'Fayette', 'Floyd', 'Forsyth', 'Franklin', 'Fulton',
    'Gilmer', 'Glascock', 'Glynn', 'Gordon', 'Grady', 'Greene', 'Gwinnett', 'Habersham', 'Hall', 'Hancock',
    'Haralson', 'Harris', 'Hart', 'Heard', 'Henry', 'Houston', 'Irwin', 'Jackson', 'Jasper', 'Jeff Davis',
    'Jefferson', 'Jenkins', 'Johnson', 'Jones', 'Lamar', 'Lanier', 'Laurens', 'Lee', 'Liberty', 'Lincoln',
    'Long', 'Lowndes', 'Lumpkin', 'Macon', 'Madison', 'Marion', 'McDuffie', 'McIntosh', 'Meriwether', 'Miller',
    'Mitchell', 'Monroe', 'Montgomery', 'Morgan', 'Murray', 'Muscogee', 'Newton', 'Oconee', 'Oglethorpe', 'Paulding',
    'Peach', 'Pickens', 'Pierce', 'Pike', 'Polk', 'Pulaski', 'Putnam', 'Quitman', 'Rabun', 'Randolph',
    'Richmond', 'Rockdale', 'Schley', 'Screven', 'Seminole', 'Spalding', 'Stephens', 'Stewart', 'Sumter', 'Talbot',
    'Taliaferro', 'Tattnall', 'Taylor', 'Telfair', 'Terrell', 'Thomas', 'Tift', 'Toombs', 'Towns', 'Treutlen',
    'Troup', 'Turner', 'Twiggs', 'Union', 'Upson', 'Walker', 'Walton', 'Ware', 'Warren', 'Washington',
    'Wayne', 'Webster', 'Wheeler', 'White', 'Whitfield', 'Wilcox', 'Wilkes', 'Wilkinson', 'Worth',
  ],
  OR: [
    'Baker', 'Benton', 'Clackamas', 'Clatsop', 'Columbia', 'Coos', 'Crook', 'Curry', 'Deschutes', 'Douglas',
    'Gilliam', 'Grant', 'Harney', 'Hood River', 'Jackson', 'Jefferson', 'Josephine', 'Klamath', 'Lake', 'Lane',
    'Lincoln', 'Linn', 'Malheur', 'Marion', 'Morrow', 'Multnomah', 'Polk', 'Sherman', 'Tillamook', 'Umatilla',
    'Union', 'Wallowa', 'Wasco', 'Washington', 'Wheeler', 'Yamhill',
  ],
};

/** Returns the official spelling if `county` is a real county in `state` (ignoring case and a trailing "County"). */
export function matchCounty(state: StateCode | '', county: string): string | null {
  if (!state) return null;
  const c = county.trim().replace(/\s+county$/i, '').toLowerCase();
  return COUNTIES[state].find((x) => x.toLowerCase() === c) ?? null;
}

/** "Lawrenceville, GA" → "Lawrenceville". The will adds the state itself. */
export function cleanCity(city: string): string {
  return city.trim().replace(/(?:,\s*|\s+)(GA|Georgia|OR|Ore|Oregon)\.?$/i, '').replace(/,\s*$/, '').trim();
}
