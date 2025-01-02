import Papa from 'papaparse';

export const downloadCSV = (data: any[], filename: string) => {
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        const escaped = typeof value === 'string' ? 
          value.replace(/"/g, '""') : 
          value;
        return `"${escaped}"`;
      }).join(',')
    )
  ];
  
  const csvContent = '\ufeff' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator && 'msSaveBlob' in navigator) {
    (navigator as any).msSaveBlob(blob, filename);
  } else {
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};