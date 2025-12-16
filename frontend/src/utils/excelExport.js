import * as XLSX from 'xlsx';

/**
 * Export data to a single-sheet Excel file
 * @param {Array} data - Array of objects or array of arrays
 * @param {Array} headers - Column headers
 * @param {string} sheetName - Name of the worksheet
 * @param {string} fileName - Output file name (without extension)
 * @param {Array} columnWidths - Optional array of column widths
 */
export const exportToExcel = (data, headers, sheetName, fileName, columnWidths = null) => {
  const wb = XLSX.utils.book_new();
  
  // Convert data to array of arrays if it's array of objects
  const rows = Array.isArray(data[0]) ? data : data.map(item => 
    headers.map((_, index) => {
      const keys = Object.keys(item);
      return item[keys[index]] || '-';
    })
  );
  
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Set column widths
  if (columnWidths) {
    ws['!cols'] = columnWidths.map(w => ({ wch: w }));
  } else {
    // Auto-calculate based on header length
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));
  }
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Export multiple sheets to a single Excel file
 * @param {Array} sheets - Array of sheet configurations
 * @param {string} fileName - Output file name (without extension)
 * 
 * Sheet configuration:
 * {
 *   name: 'Sheet Name',
 *   headers: ['Col1', 'Col2'],
 *   data: [[row1col1, row1col2], [row2col1, row2col2]],
 *   columnWidths: [20, 15] // optional
 * }
 */
export const exportMultiSheetExcel = (sheets, fileName) => {
  const wb = XLSX.utils.book_new();
  
  sheets.forEach(sheet => {
    const sheetData = [sheet.headers, ...sheet.data];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    if (sheet.columnWidths) {
      ws['!cols'] = sheet.columnWidths.map(w => ({ wch: w }));
    } else {
      ws['!cols'] = sheet.headers.map(h => ({ wch: Math.max(String(h).length + 2, 12) }));
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Format date for Excel export
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Include time in output
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '-';
  const d = new Date(date);
  return includeTime ? d.toLocaleString() : d.toLocaleDateString();
};

/**
 * Safe string value for Excel (handles null/undefined)
 * @param {any} value - Value to convert
 * @param {string} fallback - Fallback value if null/undefined
 */
export const safeValue = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

/**
 * Join array values safely
 * @param {any} value - Array or string value
 * @param {string} separator - Separator for array join
 */
export const safeArrayJoin = (value, separator = ', ') => {
  if (!value) return '-';
  if (Array.isArray(value)) return value.join(separator) || '-';
  return String(value);
};

/**
 * Create a detail sheet with key-value pairs
 * @param {string} title - Sheet title
 * @param {Array} fields - Array of [label, value] pairs
 */
export const createDetailSheet = (title, fields) => {
  const data = [
    [title],
    [''],
    ['Field', 'Value'],
    ...fields.map(([label, value]) => [label, safeValue(value)])
  ];
  return data;
};

export default {
  exportToExcel,
  exportMultiSheetExcel,
  formatDate,
  safeValue,
  safeArrayJoin,
  createDetailSheet
};
