import * as XLSX from 'xlsx';
import { SaleRow } from '../types';

export interface ParseResult {
  rows: SaleRow[];
  sheetsUsed: string[];
  totalRows: number;
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
  const REQ = ['Fecha', 'Artículo', 'Unidades', 'Vendedor'];
  const raw: any[] = [];
  const sheetsUsed: string[] = [];
  let headerRow: any[] | null = null;

  wb.SheetNames.forEach((name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return;
    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!aoa.length) return;

    const firstCell = String(aoa[0][0] || '').trim().toLowerCase();
    let dataRows: any[][];
    let headers: any[];
    let hadHeader = false;

    if (firstCell === 'fecha' || firstCell.includes('fecha')) {
      headers = aoa[0];
      dataRows = aoa.slice(1);
      hadHeader = true;
      if (!headerRow) headerRow = headers;
    } else if (headerRow) {
      headers = headerRow;
      dataRows = aoa;
    } else {
      return;
    }

    let count = 0;
    for (let j = 0; j < dataRows.length; j++) {
      const r = dataRows[j];
      if (r == null) continue;
      let empty = true;
      for (let k = 0; k < r.length; k++) {
        if (r[k] !== null && r[k] !== '') {
          empty = false;
          break;
        }
      }
      if (empty) continue;

      const obj: Record<string, any> = {};
      for (let i = 0; i < headers.length; i++) {
        if (headers[i]) {
          obj[headers[i]] = r[i] !== undefined ? r[i] : null;
        }
      }

      // Check required columns
      let ok = true;
      for (let q = 0; q < REQ.length; q++) {
        if (!(REQ[q] in obj) && !(REQ[q].toLowerCase() in obj)) {
          // Check case insensitive
          const found = Object.keys(obj).some(k => k.toLowerCase() === REQ[q].toLowerCase());
          if (!found) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;
      raw.push(obj);
      count++;
    }

    if (count > 0) {
      sheetsUsed.push(`${name} (${count.toLocaleString('es-AR')})${hadHeader ? '' : ' [hereda cabecera]'}`);
    }
  });

  const parsedRows = normalizeRaw(raw);
  return {
    rows: parsedRows,
    sheetsUsed,
    totalRows: parsedRows.length
  };
}

function normalizeRaw(raw: any[]): SaleRow[] {
  const TO = ['U', '4A', '6A', '8A', '10A', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'S/M', 'L/XL', '1', '2', '3', '4'];

  function normalizeTalle(v: any): string {
    const t = String(v == null ? '' : v).trim();
    if (!t) return '—';
    const k = t.toUpperCase().replace(/\s+/g, '').replace(/\.$/, '');
    if (k === 'UN' || k === 'U' || k === 'UNICO' || k === 'ÚNICO') return 'U';
    return TO.includes(k) ? k : t;
  }

  function toTimestamp(v: any): number | null {
    if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
    if (typeof v === 'number') {
      // Excel serial date format
      return Date.UTC(1899, 11, 30) + Math.round(v) * 86400000;
    }
    if (typeof v === 'string') {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return null;
  }

  const out: SaleRow[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ts = toTimestamp(r['Fecha'] || r['fecha']);
    if (ts === null) continue;
    const d = new Date(ts);
    const un = Number(r['Unidades'] || r['unidades'] || r['Cantidad']) || 0;
    const cliente = String(r['Cliente descripción'] || r['Cliente'] || r['cliente'] || '').trim() || '(sin cliente)';
    const art = String(r['Artículo'] || r['Articulo'] || r['articulo'] || '').trim() || '(s/a)';
    const color = String(r['Color'] || r['color'] || '—').trim();
    const talle = normalizeTalle(r['Talle'] || r['talle']);
    const loc = String(r['Localidad'] || r['localidad'] || '—').trim();
    const prov = String(r['Descripción'] || r['Provincia'] || r['provincia'] || '—').trim();
    const vend = String(r['Vendedor'] || r['vendedor'] || '(sin vendedor)').trim();
    const fam = String(r['Familia'] || r['familia'] || '—').trim();
    const grupo = String(r['Grupo'] || r['grupo'] || '—').trim();
    const linea = String(r['Línea'] || r['Linea'] || r['linea'] || '—').trim();
    const tipo = String(r['Tipo'] || r['tipo'] || '—').trim();
    const neto = Number(r['Neto'] || r['neto'] || 0) || 0;
    const sub = Number(r['Subtotal'] || r['subtotal'] || neto) || neto;

    out.push({
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
  }

  return out;
}
