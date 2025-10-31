import crypto from 'crypto';

export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  reference: string;
  balance?: number;
}

export function parseOFX(content: string): BankTransaction[] {
  const transactions: BankTransaction[] = [];
  
  // Simple OFX parser - in production use a proper library
  const lines = content.split('\n');
  let currentTxn: Partial<BankTransaction> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('<STMTTRN>')) {
      currentTxn = {};
    } else if (trimmed.startsWith('<TRNAMT>')) {
      currentTxn.amount = parseFloat(trimmed.replace(/<\/?TRNAMT>/g, '')) * 100; // Convert to cents
    } else if (trimmed.startsWith('<DTPOSTED>')) {
      const dateStr = trimmed.replace(/<\/?DTPOSTED>/g, '');
      currentTxn.date = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
    } else if (trimmed.startsWith('<NAME>')) {
      currentTxn.description = trimmed.replace(/<\/?NAME>/g, '');
    } else if (trimmed.startsWith('<MEMO>')) {
      currentTxn.reference = trimmed.replace(/<\/?MEMO>/g, '');
    } else if (trimmed.startsWith('</STMTTRN>')) {
      if (currentTxn.date && currentTxn.amount !== undefined) {
        currentTxn.id = generateTransactionId(currentTxn as BankTransaction);
        transactions.push(currentTxn as BankTransaction);
      }
    }
  }
  
  return transactions;
}

export function parseCSV(content: string): BankTransaction[] {
  const lines = content.split('\n');
  const transactions: BankTransaction[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(col => col.replace(/"/g, '').trim());
    
    if (cols.length >= 4) {
      const txn: BankTransaction = {
        id: '',
        date: cols[0], // Assume YYYY-MM-DD format
        description: cols[1],
        reference: cols[2] || '',
        amount: parseFloat(cols[3]) * 100 // Convert to cents
      };
      
      txn.id = generateTransactionId(txn);
      transactions.push(txn);
    }
  }
  
  return transactions;
}

function generateTransactionId(txn: BankTransaction): string {
  // Create deterministic ID for idempotency
  const data = `${txn.date}-${txn.amount}-${txn.description}-${txn.reference}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

export function autoMatchTransactions(bankTxns: BankTransaction[], invoices: any[]): any[] {
  const matches: any[] = [];
  
  for (const txn of bankTxns) {
    // Try to match by reference (invoice number)
    let match = invoices.find(inv => 
      txn.reference?.includes(inv.invoice_no) || 
      txn.description?.includes(inv.invoice_no)
    );
    
    // Try to match by amount
    if (!match) {
      match = invoices.find(inv => 
        Math.abs(inv.balance_cents - Math.abs(txn.amount)) < 100 // Within R1
      );
    }
    
    if (match) {
      matches.push({
        transaction: txn,
        invoice: match,
        confidence: txn.reference?.includes(match.invoice_no) ? 'high' : 'medium',
        amount_cents: Math.abs(txn.amount)
      });
    } else {
      matches.push({
        transaction: txn,
        invoice: null,
        confidence: 'none',
        amount_cents: Math.abs(txn.amount)
      });
    }
  }
  
  return matches;
}