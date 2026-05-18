// Business Layer - Data export service

class ExportService {
  toCsv(rows, columns) {
    if (!rows || !rows.length) {
      return columns.map((c) => c.label).join(',') + '\n';
    }
    const header = columns.map((c) => this.escapeCsv(c.label)).join(',');
    const body = rows.map((row) =>
      columns.map((c) => this.escapeCsv(typeof c.fn === 'function' ? c.fn(row) : row[c.key])).join(',')
    ).join('\n');
    return header + '\n' + body + '\n';
  }

  escapeCsv(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  toExcelXml(rows, columns, options = {}) {
    const title = options.title || 'Export';
    const subtitle = options.subtitle || '';
    const sheetName = this.safeSheetName(options.sheetName || title);
    const generatedAt = options.generatedAt || new Date().toISOString().slice(0, 10);
    const columnCount = Math.max(columns.length, 1);
    const titleMerge = Math.max(columnCount - 1, 0);
    const rowsXml = (rows || []).map((row) => this.excelRow(columns.map((column) => {
      const value = typeof column.fn === 'function' ? column.fn(row) : row[column.key];
      return this.excelCell(value, column.type);
    }))).join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="16"/><Alignment ss:Horizontal="Center"/></Style>
  <Style ss:ID="Subtitle"><Font ss:Size="10" ss:Color="#64748B"/><Alignment ss:Horizontal="Center"/></Style>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1F2937" ss:Pattern="Solid"/><Borders>${this.excelBorders()}</Borders></Style>
  <Style ss:ID="Cell"><Borders>${this.excelBorders()}</Borders></Style>
  <Style ss:ID="Money"><NumberFormat ss:Format="#,##0.00"/><Borders>${this.excelBorders()}</Borders></Style>
  <Style ss:ID="Date"><NumberFormat ss:Format="yyyy-mm-dd"/><Borders>${this.excelBorders()}</Borders></Style>
 </Styles>
 <Worksheet ss:Name="${this.escapeXml(sheetName)}">
  <Table>
   <Row><Cell ss:StyleID="Title" ss:MergeAcross="${titleMerge}"><Data ss:Type="String">${this.escapeXml(title)}</Data></Cell></Row>
   <Row><Cell ss:StyleID="Subtitle" ss:MergeAcross="${titleMerge}"><Data ss:Type="String">${this.escapeXml(subtitle || `Generated ${generatedAt}`)}</Data></Cell></Row>
   ${this.excelRow(columns.map((column) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${this.escapeXml(column.label)}</Data></Cell>`))}
   ${rowsXml}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>3</SplitHorizontal>
   <TopRowBottomPane>3</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
  }

  excelRow(cells) {
    return `<Row>${cells.join('')}</Row>`;
  }

  excelCell(value, type = 'string') {
    if (value === null || value === undefined || value === '') {
      return '<Cell ss:StyleID="Cell"><Data ss:Type="String"></Data></Cell>';
    }

    if (type === 'number') {
      const number = Number(value);
      return `<Cell ss:StyleID="Money"><Data ss:Type="Number">${Number.isFinite(number) ? number : 0}</Data></Cell>`;
    }

    if (type === 'date') {
      const text = this.excelDateValue(value);
      return `<Cell ss:StyleID="Date"><Data ss:Type="DateTime">${this.escapeXml(text)}T00:00:00.000</Data></Cell>`;
    }

    return `<Cell ss:StyleID="Cell"><Data ss:Type="String">${this.escapeXml(value)}</Data></Cell>`;
  }

  excelBorders() {
    return '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>';
  }

  safeSheetName(value) {
    return String(value || 'Export').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Export';
  }

  excelDateValue(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    const text = String(value || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
  }

  escapeXml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  invoiceColumns() {
    return [
      { key: 'InvoiceNumber', label: 'Invoice Number' },
      { key: 'Description', label: 'Description' },
      { key: 'Amount', label: 'Amount' },
      { key: 'AmountPaid', label: 'Amount Paid' },
      { key: 'Status', label: 'Status' },
      { key: 'IssueDate', label: 'Issue Date' },
      { key: 'DueDate', label: 'Due Date' },
      { key: 'PaidDate', label: 'Paid Date' },
      { key: 'FirstName', label: 'Student First Name' },
      { key: 'LastName', label: 'Student Last Name' }
    ];
  }

  transactionColumns() {
    return [
      { key: 'TransactionDate', label: 'Date' },
      { key: 'TransactionType', label: 'Type' },
      { key: 'Amount', label: 'Amount' },
      { key: 'Reference', label: 'Reference' },
      { key: 'Description', label: 'Description' },
      { key: 'PaymentMethod', label: 'Payment Method' },
      { key: 'InvoiceNumber', label: 'Invoice' },
      { key: 'AllocationStatus', label: 'Allocation Status' }
    ];
  }

  studentColumns() {
    return [
      { key: 'FirstName', label: 'First Name' },
      { key: 'LastName', label: 'Last Name' },
      { key: 'FamilyName', label: 'Family' },
      { key: 'ClassName', label: 'Class' },
      { key: 'BillingDate', label: 'Billing Date' },
      { key: 'EnrolledDate', label: 'Enrolled Date' },
      { key: 'IsActive', label: 'Active' },
      { key: 'CategoryName', label: 'Billing Category' }
    ];
  }

  employeeColumns() {
    return [
      { key: 'FirstName', label: 'First Name' },
      { key: 'LastName', label: 'Last Name' },
      { key: 'EmployeeNumber', label: 'Employee Number' },
      { key: 'PayrollNumber', label: 'Payroll Number' },
      { key: 'Email', label: 'Email' },
      { key: 'JobTitle', label: 'Job Title' },
      { key: 'Department', label: 'Department' },
      { key: 'PhysicalAddress', label: 'Physical Address' },
      { key: 'StartDate', label: 'Start Date' },
      { key: 'Salary', label: 'Salary' },
      { key: 'LeaveBalance', label: 'Leave Balance' }
    ];
  }

  outstandingFeesColumns() {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const cols = [
      { key: 'FirstName', label: 'Student Name' },
      { key: 'LastName', label: 'Student Surname' },
      { key: 'ClassName', label: 'Class' },
      { key: 'FamilyCode', label: 'Family Code' },
      { key: 'PrimaryParentPhone', label: 'Parent 1 Cell' },
      { key: 'SecondaryParentPhone', label: 'Parent 2 Cell' },
      { key: 'ResponsiblePayer', label: 'Responsible Payer' },
      { key: 'ResponsiblePayerPhone', label: 'Responsible Payer Cell' },
      { key: 'ResponsiblePayerEmail', label: 'Responsible Payer Email' }
    ];
    for (let m = 0; m < 12; m++) {
      const monthKey = `Month${m + 1}`;
      cols.push({ key: monthKey, label: months[m], type: 'number' });
    }
    cols.push({ key: 'TotalOutstanding', label: 'Total Outstanding', type: 'number' });
    cols.push({ key: 'PromiseToPayStatus', label: 'Promise-to-Pay Status' });
    cols.push({ key: 'PromisedPaymentDate', label: 'Promised Payment Date', type: 'date' });
    cols.push({ key: 'ExportDate', label: 'Export Date', type: 'date' });
    cols.push({ key: 'SchoolName', label: 'School Name' });
    return cols;
  }

  studentStatementRows(statement) {
    const invoices = Array.isArray(statement?.invoices) ? statement.invoices : [];
    const transactions = Array.isArray(statement?.transactions) ? statement.transactions : [];
    const bbfRows = Array.isArray(statement?.balanceBroughtForward) ? statement.balanceBroughtForward : [];
    const balanceBroughtForward = bbfRows.reduce((sum, item) =>
      sum + Number(item.OutstandingAmount || 0) - Number(item.AdvanceCreditAmount || 0), 0);
    const rows = [];
    let balance = balanceBroughtForward;

    rows.push({
      Date: '',
      Type: 'Balance brought forward',
      Reference: 'Opening balance',
      Description: 'Outstanding less advance credit carried forward',
      Debit: balanceBroughtForward > 0 ? balanceBroughtForward : 0,
      Credit: balanceBroughtForward < 0 ? Math.abs(balanceBroughtForward) : 0,
      Balance: balance
    });

    const movements = [
      ...invoices.map((invoice) => ({
        date: this.excelDateValue(invoice.IssueDate || invoice.DueDate || invoice.CreatedDate),
        type: 'Invoice',
        reference: invoice.InvoiceNumber,
        description: invoice.Description || invoice.CategoryName || 'Invoice',
        debit: Number(invoice.Amount || 0),
        credit: 0
      })),
      ...transactions.map((transaction) => ({
        date: this.excelDateValue(transaction.TransactionDate || transaction.CreatedDate),
        type: 'Payment',
        reference: transaction.ReceiptNumber || transaction.Reference || transaction.InvoiceNumber || 'Payment',
        description: transaction.Description || transaction.PaymentMethod || 'Payment received',
        debit: 0,
        credit: Number(transaction.Amount || 0)
      }))
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.type).localeCompare(String(b.type)));

    for (const movement of movements) {
      balance = Math.round((balance + movement.debit - movement.credit) * 100) / 100;
      rows.push({
        Date: movement.date,
        Type: movement.type,
        Reference: movement.reference,
        Description: movement.description,
        Debit: movement.debit,
        Credit: movement.credit,
        Balance: balance
      });
    }

    rows.push({
      Date: '',
      Type: 'Advance wallet',
      Reference: 'Current wallet balance',
      Description: `Unallocated advance payment held for future invoices: ${Number(statement?.wallet?.Balance || 0).toFixed(2)}`,
      Debit: 0,
      Credit: 0,
      Balance: balance
    });

    return rows;
  }

  studentStatementColumns() {
    return [
      { key: 'Date', label: 'Date', type: 'date' },
      { key: 'Type', label: 'Type' },
      { key: 'Reference', label: 'Reference' },
      { key: 'Description', label: 'Description' },
      { key: 'Debit', label: 'Debit', type: 'number' },
      { key: 'Credit', label: 'Credit', type: 'number' },
      { key: 'Balance', label: 'Balance', type: 'number' }
    ];
  }

  studentStatementHtml(statement) {
    const student = statement?.student || {};
    const rows = this.studentStatementRows(statement);
    const walletBalance = Number(statement?.wallet?.Balance || 0);
    const totalDebit = rows.reduce((sum, row) => sum + Number(row.Debit || 0), 0);
    const totalCredit = rows.reduce((sum, row) => sum + Number(row.Credit || 0), 0);
    const closingBalance = rows.length ? Number(rows[rows.length - 1].Balance || 0) : 0;
    const schoolName = student.SchoolName || statement?.school?.SchoolName || 'School';
    const studentName = `${student.FirstName || ''} ${student.LastName || ''}`.trim() || `Student ${student.StudentID || ''}`;

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Statement - ${this.escapeXml(studentName)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 28px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 0 0 18px; color: #4b5563; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
    .summary div { border: 1px solid #d1d5db; padding: 10px; }
    .summary span { display: block; font-size: 11px; color: #6b7280; }
    .summary strong { font-size: 15px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 7px; font-size: 12px; text-align: left; }
    th { background: #111827; color: white; }
    td.money { text-align: right; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${this.escapeXml(schoolName)}</h1>
  <h2>Parent Account Statement - ${this.escapeXml(studentName)}</h2>
  <div class="summary">
    <div><span>Total debit</span><strong>${this.escapeXml(totalDebit.toFixed(2))}</strong></div>
    <div><span>Total credit</span><strong>${this.escapeXml(totalCredit.toFixed(2))}</strong></div>
    <div><span>Advance wallet</span><strong>${this.escapeXml(walletBalance.toFixed(2))}</strong></div>
    <div><span>Closing balance</span><strong>${this.escapeXml(closingBalance.toFixed(2))}</strong></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>
        <td>${this.escapeXml(row.Date || '')}</td>
        <td>${this.escapeXml(row.Type || '')}</td>
        <td>${this.escapeXml(row.Reference || '')}</td>
        <td>${this.escapeXml(row.Description || '')}</td>
        <td class="money">${this.escapeXml(Number(row.Debit || 0).toFixed(2))}</td>
        <td class="money">${this.escapeXml(Number(row.Credit || 0).toFixed(2))}</td>
        <td class="money">${this.escapeXml(Number(row.Balance || 0).toFixed(2))}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;
  }
}

module.exports = ExportService;
