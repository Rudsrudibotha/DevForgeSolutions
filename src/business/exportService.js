// Business Layer - Data export service (CSV)

class ExportService {
  toCsv(rows, columns) {
    if (!rows || !rows.length) {
      return columns.map((c) => c.label).join(',') + '\n';
    }

    const header = columns.map((c) => this.escapeCsv(c.label)).join(',');
    const body = rows.map((row) =>
      columns.map((c) => this.escapeCsv(row[c.key])).join(',')
    ).join('\n');

    return header + '\n' + body + '\n';
  }

  escapeCsv(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
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
      { key: 'InvoiceNumber', label: 'Invoice' }
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
      { key: 'Email', label: 'Email' },
      { key: 'JobTitle', label: 'Job Title' },
      { key: 'Department', label: 'Department' },
      { key: 'StartDate', label: 'Start Date' },
      { key: 'Salary', label: 'Salary' },
      { key: 'LeaveBalance', label: 'Leave Balance' }
    ];
  }
}

module.exports = ExportService;
