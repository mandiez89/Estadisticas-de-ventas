import * as XLSX from 'xlsx';
import { SaleRow } from '../types';

export interface ParseResult {
  rows: SaleRow[];
  sheetsUsed: string[];
  totalRows: number;
}

// Normalize text for flexible header matching (removes accents, spaces, lowercase)
function cleanHeader(s: any): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Robust number parsing handling Argentine format (e.g. "85,60", "1.450,50", "$ 70,19", or native numbers)
function parseNumber(v: any): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') {
    let s = v.trim().replace(/\$/g, '').replace(/\s+/g, '');
    if (!s) return 0;
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// Robust date parsing handling Argentine DD/MM/YY (e.g. 02/10/19), DD/MM/YYYY, Excel serial, and Date objects
function toTimestamp(v: any): number | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();

  if (typeof v === 'number') {
    // Excel serial date format (between 20000 and 80000 corresponds to 1954 to 2119)
    if (v > 20000 && v < 80000) {
      const date = new Date(Math.round((v - 25569) * 86400 * 1000));
      return date.getTime();
    }
    if (v > 1000000000000) return v;
  }

  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;

    // Matches DD/MM/YY or DD/MM/YYYY or DD-MM-YY
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1; // 0-based
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      const d = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // Matches YYYY-MM-DD
    const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    const fallback = new Date(s);
    if (!isNaN(fallback.getTime())) return fallback.getTime();
  }

  return null;
}

const TO = ['U', '4A', '6A', '8A', '10A', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'S/M', 'L/XL', '1', '2', '3', '4'];

function normalizeTalle(v: any): string {
  const t = String(v == null ? '' : v).trim();
  if (!t) return '—';
  const k = t.toUpperCase().replace(/\s+/g, '').replace(/\.$/, '');
  if (k === 'UN' || k === 'U' || k === 'UNICO' || k === 'ÚNICO') return 'U';
  return TO.includes(k) ? k : t;
}

interface ColumnIndices {
  colFecha: number;
  colCliente: number;
  colArt: number;
  colColor: number;
  colTalle: number;
  colUn: number;
  colLoc: number;
  colProv: number;
  colVend: number;
  colFam: number;
  colGrupo: number;
  colLinea: number;
  colTipo: number;
  colNeto: number;
  colSub: number;
}

function detectColumnIndices(headers: any[]): ColumnIndices | null {
  const indices: ColumnIndices = {
    colFecha: -1,
    colCliente: -1,
    colArt: -1,
    colColor: -1,
    colTalle: -1,
    colUn: -1,
    colLoc: -1,
    colProv: -1,
    colVend: -1,
    colFam: -1,
    colGrupo: -1,
    colLinea: -1,
    colTipo: -1,
    colNeto: -1,
    colSub: -1
  };

  headers.forEach((h, idx) => {
    const clean = cleanHeader(h);
    if (!clean) return;

    if (clean === 'fecha' || clean.startsWith('fec')) {
      indices.colFecha = idx;
    } else if (clean.includes('cliente') || clean.includes('razonsocial')) {
      indices.colCliente = idx;
    } else if (clean === 'articulo' || clean === 'art' || clean.startsWith('art') || clean === 'producto' || clean === 'item') {
      indices.colArt = idx;
    } else if (clean === 'color' || clean === 'col') {
      indices.colColor = idx;
    } else if (clean === 'talle' || clean === 'medida' || clean === 'size') {
      indices.colTalle = idx;
    } else if (clean.includes('unidad') || clean === 'un' || clean.includes('cant')) {
      indices.colUn = idx;
    } else if (clean.includes('localidad') || clean === 'ciudad') {
      indices.colLoc = idx;
    } else if (clean.includes('provincia') || clean === 'descripcion' || clean === 'descrip') {
      // In reports like the one in the user screenshot, 'Descripción' holds the province (Buenos Aires)
      indices.colProv = idx;
    } else if (clean.includes('vendedor') || clean === 'vend') {
      indices.colVend = idx;
    } else if (clean.includes('familia') || clean === 'fam') {
      indices.colFam = idx;
    } else if (clean.includes('grupo') || clean === 'rubro') {
      indices.colGrupo = idx;
    } else if (clean.includes('linea') || clean === 'lin') {
      indices.colLinea = idx;
    } else if (clean === 'tipo') {
      indices.colTipo = idx;
    } else if (clean.includes('neto')) {
      indices.colNeto = idx;
    } else if (clean.includes('subtotal') || clean === 'sub' || clean.includes('importe') || clean === 'total') {
      indices.colSub = idx;
    }
  });

  // Minimum requirements: must have Fecha, Art, and at least one of (Unidades, Subtotal, Cliente)
  if (indices.colFecha !== -1 && indices.colArt !== -1) {
    return indices;
  }
  return null;
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  // Read both .xls and .xlsx using SheetJS
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
  const rows: SaleRow[] = [];
  const sheetsUsed: string[] = [];

  let globalIndices: ColumnIndices | null = null;
  let globalHeaderNames: string[] = [];

  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return;

    // Convert sheet to array of arrays (rows)
    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!aoa.length) return;

    // 1. Check if this sheet contains its own header row in the first 15 rows
    let sheetHeaderIndex = -1;
    let sheetIndices: ColumnIndices | null = null;

    for (let r = 0; r < Math.min(aoa.length, 15); r++) {
      const row = aoa[r];
      if (!Array.isArray(row)) continue;
      const detected = detectColumnIndices(row);
      if (detected) {
        sheetHeaderIndex = r;
        sheetIndices = detected;
        if (!globalIndices) {
          globalIndices = detected;
          globalHeaderNames = row.map(String);
        }
        break;
      }
    }

    // 2. Decide data rows and column indices:
    // If this sheet has headers: data starts after sheetHeaderIndex
    // If this sheet has NO headers: it inherits globalIndices from Sheet 1, starting at row 0
    let dataRows: any[][];
    let effectiveIndices: ColumnIndices;
    const hasOwnHeader = sheetIndices !== null;

    if (hasOwnHeader) {
      effectiveIndices = sheetIndices!;
      dataRows = aoa.slice(sheetHeaderIndex + 1);
    } else if (globalIndices) {
      effectiveIndices = globalIndices;
      dataRows = aoa;
    } else {
      // First sheet and no headers found
      return;
    }

    let sheetRowCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      if (!r || !Array.isArray(r) || r.length === 0) continue;

      // Extract Fecha
      const rawFecha = effectiveIndices.colFecha !== -1 ? r[effectiveIndices.colFecha] : null;
      const ts = toTimestamp(rawFecha);

      // If no valid date, this row is either empty, a subtotal, a repeated header, or a footer
      if (ts === null) continue;

      const d = new Date(ts);

      // Extract Articulo
      const rawArt = effectiveIndices.colArt !== -1 ? r[effectiveIndices.colArt] : '';
      const art = String(rawArt == null ? '' : rawArt).trim();
      if (!art || art === '—') continue;

      // Extract other fields
      const cliente = effectiveIndices.colCliente !== -1 && r[effectiveIndices.colCliente] != null
        ? String(r[effectiveIndices.colCliente]).trim()
        : '(sin cliente)';

      const color = effectiveIndices.colColor !== -1 && r[effectiveIndices.colColor] != null
        ? String(r[effectiveIndices.colColor]).trim()
        : '—';

      const talle = effectiveIndices.colTalle !== -1
        ? normalizeTalle(r[effectiveIndices.colTalle])
        : '—';

      const un = effectiveIndices.colUn !== -1
        ? parseNumber(r[effectiveIndices.colUn])
        : 0;

      const loc = effectiveIndices.colLoc !== -1 && r[effectiveIndices.colLoc] != null
        ? String(r[effectiveIndices.colLoc]).trim()
        : '—';

      const prov = effectiveIndices.colProv !== -1 && r[effectiveIndices.colProv] != null
        ? String(r[effectiveIndices.colProv]).trim()
        : '—';

      const vend = effectiveIndices.colVend !== -1 && r[effectiveIndices.colVend] != null
        ? String(r[effectiveIndices.colVend]).trim()
        : '(sin vendedor)';

      const fam = effectiveIndices.colFam !== -1 && r[effectiveIndices.colFam] != null
        ? String(r[effectiveIndices.colFam]).trim()
        : '—';

      const grupo = effectiveIndices.colGrupo !== -1 && r[effectiveIndices.colGrupo] != null
        ? String(r[effectiveIndices.colGrupo]).trim()
        : '—';

      const linea = effectiveIndices.colLinea !== -1 && r[effectiveIndices.colLinea] != null
        ? String(r[effectiveIndices.colLinea]).trim()
        : '—';

      const tipo = effectiveIndices.colTipo !== -1 && r[effectiveIndices.colTipo] != null
        ? String(r[effectiveIndices.colTipo]).trim()
        : '—';

      const neto = effectiveIndices.colNeto !== -1
        ? parseNumber(r[effectiveIndices.colNeto])
        : 0;

      const sub = effectiveIndices.colSub !== -1
        ? parseNumber(r[effectiveIndices.colSub]) || neto
        : neto;

      rows.push({
        y: d.getFullYear(),
        m: d.getMonth(),
        q: Math.floor(d.getMonth() / 3),
        ts,
        cliente,
        art,
        color,
        talle,
        un,
        doc: un / 12,
        loc,
        prov,
        vend,
        fam,
        grupo,
        linea,
        tipo,
        neto,
        sub
      });

      sheetRowCount++;
    }

    if (sheetRowCount > 0) {
      sheetsUsed.push(
        `${sheetName} (${sheetRowCount.toLocaleString('es-AR')} filas)${hasOwnHeader ? '' : ' [hereda columnas de hoja 1]'}`
      );
    }
  });

  return {
    rows,
    sheetsUsed,
    totalRows: rows.length
  };
}
