import { SaleRow } from '../types';

export function generateDemoData(): SaleRow[] {
  const vendors = ['Ana Pereyra', 'Diego Sosa', 'Marta Ruiz', 'Luis Bravo', 'Carlos Benítez'];
  const clients = [
    { name: 'Casa Blanca Mayorista', prov: 'Buenos Aires', loc: 'CABA' },
    { name: 'Todo Textil S.A.', prov: 'Buenos Aires', loc: 'La Plata' },
    { name: 'El Ropero Central', prov: 'Córdoba', loc: 'Córdoba Capital' },
    { name: 'Mayorista Norte', prov: 'Santa Fe', loc: 'Rosario' },
    { name: 'Distribuidora del Sur', prov: 'Buenos Aires', loc: 'Mar del Plata' },
    { name: 'Boutique Lía', prov: 'Mendoza', loc: 'Mendoza Capital' },
    { name: 'Almacén Vega Textil', prov: 'Tucumán', loc: 'San Miguel' },
    { name: 'Tienda Sol & Luna', prov: 'Entre Ríos', loc: 'Paraná' },
    { name: 'Mercería y Confección San Juan', prov: 'San Juan', loc: 'San Juan' },
    { name: 'Indumentaria Don Bosco', prov: 'Córdoba', loc: 'Río Cuarto' },
    { name: 'Confecciones del Valle', prov: 'Neuquén', loc: 'Neuquén Capital' },
    { name: 'Punto y Lana Mayoristas', prov: 'Santa Fe', loc: 'Santa Fe Capital' },
    { name: 'La Gran Oferta SRL', prov: 'Salta', loc: 'Salta' },
    { name: 'Modas Palermo', prov: 'Buenos Aires', loc: 'CABA' },
    { name: 'Centro Mayorista Chaco', prov: 'Chaco', loc: 'Resistencia' },
    { name: 'Pilar Lencería', prov: 'Buenos Aires', loc: 'Pilar' }
  ];

  const articles = [
    { art: 'ART-100', fam: 'Media', linea: 'Clásica', grupo: 'Calcetería Hombre', tipo: 'Algodón Peinado', basePrice: 4200 },
    { art: 'ART-105', fam: 'Media', linea: 'Deportiva', grupo: 'Calcetería Unisex', tipo: 'Térmica Rib', basePrice: 4900 },
    { art: 'ART-210', fam: 'Soquete', linea: 'Deportiva', grupo: 'Calcetería Corta', tipo: 'Dry-Fit Antideslizante', basePrice: 3800 },
    { art: 'ART-220', fam: 'Soquete', linea: 'Clásica', grupo: 'Calcetería Corta', tipo: 'Invisible Algodón', basePrice: 3400 },
    { art: 'ART-315', fam: 'Bota', linea: 'Invierno', grupo: 'Abrigo Especial', tipo: 'Lana Térmica Gruesa', basePrice: 6800 },
    { art: 'ART-420', fam: 'Boxer', linea: 'Interior', grupo: 'Ropa Interior', tipo: 'Algodón con Lycra', basePrice: 7900 },
    { art: 'ART-430', fam: 'Boxer', linea: 'Deportiva', grupo: 'Ropa Interior', tipo: 'Microfibra Sin Costura', basePrice: 8500 },
    { art: 'ART-510', fam: 'Slip', linea: 'Interior', grupo: 'Ropa Interior', tipo: 'Clásico Algodón', basePrice: 5900 },
    { art: 'ART-610', fam: 'Camiseta', linea: 'Interior', grupo: 'Primeras Capas', tipo: 'Térmica Manga Larga', basePrice: 11500 },
    { art: 'ART-720', fam: 'Top', linea: 'Deportiva', grupo: 'Deporte Femenino', tipo: 'Sujeción Media', basePrice: 9400 },
    { art: 'ART-850', fam: 'Pijama', linea: 'Noche', grupo: 'Homewear', tipo: 'Conjunto Algodón Soft', basePrice: 22000 }
  ];

  const colors = ['NEGRO', 'BLANCO', 'AZUL MARINO', 'GRIS MELANGE', 'ROJO', 'AERO', 'BEIGE', 'BORDO'];
  const sizes = ['U', '4A', '6A', '8A', 'S', 'M', 'L', 'XL', '2XL', 'S/M', 'L/XL'];

  const rows: SaleRow[] = [];
  const startYear = 2024;
  const endYear = 2026;

  let seed = 42;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let y = startYear; y <= endYear; y++) {
    // Current year might have months up to August/September
    const maxMonth = (y === 2026) ? 8 : 11;

    for (let m = 0; m <= maxMonth; m++) {
      const q = Math.floor(m / 3);
      // seasonal boost: winter (May-Aug in Southern Hemisphere) boosts socks/winter items
      const isWinter = m >= 4 && m <= 7;
      const seasonalMultiplier = isWinter ? 1.35 : 1.0;
      // inflation multiplier for prices across years
      const inflationMultiplier = y === 2024 ? 1.0 : (y === 2025 ? 1.9 : 3.4);

      const transactionsInMonth = 95 + Math.floor(pseudoRandom() * 35);

      for (let i = 0; i < transactionsInMonth; i++) {
        const clientObj = clients[Math.floor(pseudoRandom() * clients.length)];
        const vend = vendors[Math.floor(pseudoRandom() * vendors.length)];
        const artObj = articles[Math.floor(pseudoRandom() * articles.length)];
        const color = colors[Math.floor(pseudoRandom() * colors.length)];
        const talle = sizes[Math.floor(pseudoRandom() * sizes.length)];

        // Quantity in dozens
        const dozenBase = 1 + Math.floor(pseudoRandom() * 18);
        const dozenAdjusted = Math.max(1, Math.round(dozenBase * (artObj.fam === 'Media' || artObj.fam === 'Soquete' ? 1.5 : 0.8)));
        const un = dozenAdjusted * 12;
        const doc = dozenAdjusted;

        // Base price per dozen with inflation
        const unitPriceDozen = artObj.basePrice * inflationMultiplier * (isWinter && artObj.linea === 'Invierno' ? 1.15 : 1.0);
        const neto = Math.round(doc * unitPriceDozen);

        // Commercial discount: 5% to 22%
        const discountRate = 0.05 + pseudoRandom() * 0.17;
        const sub = Math.round(neto * (1 - discountRate));

        const day = 1 + Math.floor(pseudoRandom() * 28);
        const ts = Date.UTC(y, m, day);

        rows.push({
          y,
          m,
          q,
          ts,
          cliente: clientObj.name,
          art: artObj.art,
          color,
          talle,
          un,
          doc,
          loc: clientObj.loc,
          prov: clientObj.prov,
          vend,
          fam: artObj.fam,
          grupo: artObj.grupo,
          linea: artObj.linea,
          tipo: artObj.tipo,
          neto,
          sub
        });
      }
    }
  }

  return rows;
}
