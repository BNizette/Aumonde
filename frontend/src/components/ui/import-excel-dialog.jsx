import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileSpreadsheet, X, CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * Reusable Import Excel Dialog component
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.title - Dialog title (e.g., "Import Vessels")
 * @param {string} props.description - Dialog description
 * @param {Array} props.templateColumns - Array of column names for the template (single sheet)
 * @param {Array} props.templateSampleData - Optional sample data rows for template (single sheet)
 * @param {Array} props.worksheets - For multi-sheet: [{name, columns, sampleData}]
 * @param {function} props.onImport - Callback with parsed data (array for single sheet, object with sheet names for multi)
 * @param {function} props.validateRow - Optional row validation function
 * @param {string} props.templateFileName - Filename for template download
 */
const ImportExcelDialog = ({
  open,
  onClose,
  title = 'Import from Excel',
  description = 'Upload an Excel file to import data. Download the template for the correct format.',
  templateColumns = [],
  templateSampleData = [],
  worksheets = [], // For multi-worksheet support
  onImport,
  validateRow,
  templateFileName = 'import_template.xlsx'
}) => {
  const isMultiSheet = worksheets.length > 0;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '.xlsx',
      '.xls'
    ];
    
    if (!validTypes.some(type => selectedFile.type.includes(type) || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setError('');
    setValidationErrors([]);
    parseFile(selectedFile);
  };

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          setError('File appears to be empty or only contains headers');
          return;
        }

        // First row is headers, rest is data
        const headers = jsonData[0];
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        
        // Convert to objects
        const parsedData = rows.map((row, rowIndex) => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] !== undefined ? row[index] : '';
          });
          return { ...obj, _rowIndex: rowIndex + 2 }; // +2 for 1-based index and header row
        });

        // Validate rows if validator provided
        if (validateRow) {
          const errors = [];
          parsedData.forEach((row, index) => {
            const rowErrors = validateRow(row);
            if (rowErrors && rowErrors.length > 0) {
              errors.push({ row: row._rowIndex, errors: rowErrors });
            }
          });
          setValidationErrors(errors);
        }

        setPreview(parsedData.slice(0, 5)); // Show first 5 rows as preview
      } catch (err) {
        console.error('Error parsing Excel file:', err);
        setError('Error parsing file. Please ensure it is a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    if (isMultiSheet) {
      // Multi-worksheet template
      worksheets.forEach(sheet => {
        const data = [sheet.columns];
        if (sheet.sampleData && sheet.sampleData.length > 0) {
          sheet.sampleData.forEach(row => data.push(row));
        }
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = sheet.columns.map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
    } else {
      // Single sheet template
      const data = [templateColumns];
      if (templateSampleData.length > 0) {
        templateSampleData.forEach(row => data.push(row));
      }
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = templateColumns.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
    }
    
    XLSX.writeFile(wb, templateFileName);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    if (validationErrors.length > 0) {
      setError('Please fix validation errors before importing');
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (isMultiSheet) {
          // Multi-worksheet import - parse all sheets
          const allSheetsData = {};
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            allSheetsData[sheetName] = XLSX.utils.sheet_to_json(worksheet);
          });
          if (onImport) {
            await onImport(allSheetsData);
          }
        } else {
          // Single sheet import
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          if (onImport) {
            await onImport(jsonData);
          }
        }
        
        handleClose();
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Error importing data: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setError('');
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange({ target: { files: [droppedFile] } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-blue-900">Download Template</p>
              <p className="text-sm text-blue-700">Get the correct format for importing data</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="bg-white">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              id="excel-upload"
            />
            
            {file ? (
              <div className="space-y-2">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-green-600">{preview.length} rows ready to import</p>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPreview([]); }}>
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <label htmlFor="excel-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="font-medium text-gray-700">Drop your Excel file here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </label>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Validation errors found:</p>
                <ul className="list-disc list-inside mt-1 text-sm">
                  {validationErrors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.errors.join(', ')}</li>
                  ))}
                  {validationErrors.length > 5 && (
                    <li>...and {validationErrors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {preview.length > 0 && validationErrors.length === 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b">
                <p className="font-medium text-sm">Preview (first {preview.length} rows)</p>
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(preview[0] || {}).filter(k => k !== '_rowIndex').map(key => (
                        <th key={key} className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {Object.entries(row).filter(([k]) => k !== '_rowIndex').map(([key, value], cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                            {String(value || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || validationErrors.length > 0 || importing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importing ? 'Importing...' : 'Import Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ImportExcelDialog };
export default ImportExcelDialog;
