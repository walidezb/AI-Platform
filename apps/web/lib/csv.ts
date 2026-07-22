export function downloadCsvTemplate() {
  const content = [
    'fullName,email,department,jobTitle',
    'Alice Smith,alice@company.com,Engineering,Senior Engineer',
    'Bob Jones,bob@company.com,Product,Product Manager',
    'Carol Wu,carol@company.com,Design,UX Designer',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'invite-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
