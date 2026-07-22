export type ParsedEmployee = {
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  role?: string;
  // Validation state — added during parse
  _errors: string[];
  _rowIndex: number;
};

const REQUIRED_COLUMNS = ['email', 'fullName'];
const OPTIONAL_COLUMNS = ['department', 'jobTitle', 'role'];

// Common column name aliases managers might use
const COLUMN_ALIASES: Record<string, string> = {
  name: 'fullName',
  'full name': 'fullName',
  full_name: 'fullName',
  employee: 'fullName',
  email: 'email',
  'e-mail': 'email',
  e_mail: 'email',
  dept: 'department',
  department: 'department',
  title: 'jobTitle',
  'job title': 'jobTitle',
  job_title: 'jobTitle',
  position: 'jobTitle',
  role: 'role',
};

export function parseCSV(rawText: string): {
  employees: ParsedEmployee[];
  errors: string[];
  totalRows: number;
  validRows: number;
} {
  const lines = rawText
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      employees: [],
      errors: ['CSV must have a header row and at least one data row'],
      totalRows: 0,
      validRows: 0,
    };
  }

  // Parse header row — handle BOM
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const rawHeaders = headerLine
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Map raw headers to canonical column names
  const columnMap: Record<number, string> = {};
  rawHeaders.forEach((raw, idx) => {
    const canonical = COLUMN_ALIASES[raw];
    if (canonical) columnMap[idx] = canonical;
  });

  // Check required columns
  const globalErrors: string[] = [];
  const foundColumns = Object.values(columnMap);
  REQUIRED_COLUMNS.forEach((col) => {
    if (!foundColumns.includes(col)) {
      globalErrors.push(
        `Missing required column: "${col}". Found: ${rawHeaders.join(', ')}`,
      );
    }
  });

  if (globalErrors.length) {
    return {
      employees: [],
      errors: globalErrors,
      totalRows: 0,
      validRows: 0,
    };
  }

  // Parse data rows
  const employees: ParsedEmployee[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const rowDict: Record<string, string> = {};

    // Map values to column names
    Object.entries(columnMap).forEach(([idx, col]) => {
      rowDict[col] = values[Number(idx)]?.trim().replace(/^["']|["']$/g, '') ?? '';
    });

    // Fill missing optional columns with empty string
    OPTIONAL_COLUMNS.forEach((col) => {
      if (!rowDict[col]) rowDict[col] = '';
    });

    const errors: string[] = [];
    const email = rowDict.email ?? '';
    const fullName = rowDict.fullName ?? '';
    const department = rowDict.department ?? '';
    const jobTitle = rowDict.jobTitle ?? '';
    const role = rowDict.role ?? '';

    // Per-row validation
    if (!email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Invalid email: "${email}"`);
    }

    if (!fullName) {
      errors.push('Name is required');
    }

    employees.push({
      fullName,
      email,
      department,
      jobTitle,
      role,
      _errors: errors,
      _rowIndex: i + 1,
    });
  }

  const validRows = employees.filter((e) => e._errors.length === 0).length;

  return {
    employees,
    errors: globalErrors,
    totalRows: employees.length,
    validRows,
  };
}

// Parse a single CSV line, handling quoted values with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && !inQuotes) {
      inQuotes = true;
      continue;
    }
    if (char === '"' && inQuotes) {
      inQuotes = false;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

// Generate a downloadable CSV template
export function generateCSVTemplate(): string {
  const headers = 'fullName,email,department,jobTitle,role';
  const example =
    'Alice Smith,alice@company.com,Engineering,Senior Engineer,LEARNER';
  return `${headers}\n${example}`;
}
