const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getMonthKey,
  getDaysInMonth,
  normalizeTransaction,
  computeBudgetSummary,
  buildBudgetAlerts,
  buildBudgetTrend,
  filterTransactions
} = require('../budget.js');

test('měsíc se vytvoří ve formátu YYYY-MM', () => {
  assert.equal(getMonthKey(new Date('2026-09-15T12:00:00')), '2026-09');
});

test('počet dnů odpovídá měsíci včetně přestupného února', () => {
  assert.equal(getDaysInMonth('2026-02'), 28);
  assert.equal(getDaysInMonth('2024-02'), 29);
  assert.equal(getDaysInMonth('2026-04'), 30);
});

test('souhrn měsíčního rozpočtu počítá plán, skutečnost a zůstatek', () => {
  const categories = [
    { id: 'income-1', name: 'Mzda', type: 'income', limit: 35000 },
    { id: 'expense-1', name: 'Jídlo', type: 'expense', limit: 12000 },
    { id: 'expense-2', name: 'Doprava', type: 'expense', limit: 6000 }
  ];

  const transactions = [
    { id: 'tx-1', monthKey: '2026-09', categoryId: 'income-1', type: 'income', amount: 35000, date: '2026-09-01' },
    { id: 'tx-2', monthKey: '2026-09', categoryId: 'expense-1', type: 'expense', amount: 9800, date: '2026-09-05' },
    { id: 'tx-3', monthKey: '2026-09', categoryId: 'expense-2', type: 'expense', amount: 3300, date: '2026-09-07' }
  ];

  const summary = computeBudgetSummary('2026-09', categories, transactions);

  assert.equal(summary.totalPlannedIncome, 35000);
  assert.equal(summary.totalPlannedExpenses, 18000);
  assert.equal(summary.totalActualIncome, 35000);
  assert.equal(summary.totalActualExpenses, 13100);
  assert.equal(summary.monthlyBalance, 21900);
});

test('varování se aktivuje při překročení rozpočtu i při kritickém zůstatku', () => {
  const categories = [
    { id: 'expense-1', name: 'Jídlo', type: 'expense', limit: 5000 },
    { id: 'expense-2', name: 'Zábava', type: 'expense', limit: 2000 }
  ];

  const transactions = [
    { id: 'tx-1', monthKey: '2026-09', categoryId: 'expense-1', type: 'expense', amount: 5500, date: '2026-09-02' },
    { id: 'tx-2', monthKey: '2026-09', categoryId: 'expense-2', type: 'expense', amount: 1500, date: '2026-09-03' }
  ];

  const summary = computeBudgetSummary('2026-09', categories, transactions);
  const alerts = buildBudgetAlerts(summary, categories, transactions);

  assert.ok(alerts.some((alert) => alert.level === 'critical' && alert.categoryName === 'Jídlo'));
  assert.ok(alerts.some((alert) => alert.level === 'warning' && alert.categoryName === 'Zábava'));
});

test('vývoj rozpočtu napříč měsíci počítá celkový zůstatek a výdaje pro každý měsíc', () => {
  const categories = [
    { id: 'income-1', name: 'Mzda', type: 'income', limit: 35000 },
    { id: 'expense-1', name: 'Jídlo', type: 'expense', limit: 8000 },
    { id: 'expense-2', name: 'Doprava', type: 'expense', limit: 4000 }
  ];

  const transactions = [
    { id: 'tx-1', monthKey: '2026-08', categoryId: 'income-1', type: 'income', amount: 34000, date: '2026-08-01' },
    { id: 'tx-2', monthKey: '2026-08', categoryId: 'expense-1', type: 'expense', amount: 7000, date: '2026-08-05' },
    { id: 'tx-3', monthKey: '2026-09', categoryId: 'income-1', type: 'income', amount: 35000, date: '2026-09-01' },
    { id: 'tx-4', monthKey: '2026-09', categoryId: 'expense-1', type: 'expense', amount: 9000, date: '2026-09-08' },
    { id: 'tx-5', monthKey: '2026-09', categoryId: 'expense-2', type: 'expense', amount: 3000, date: '2026-09-10' }
  ];

  const trend = buildBudgetTrend(['2026-08', '2026-09'], categories, transactions);

  assert.equal(trend[0].label, 'srp');
  assert.equal(trend[0].balance, 27000);
  assert.equal(trend[1].spent, 12000);
  assert.equal(trend[1].balance, 23000);
});

test('kumulovaný vývoj započítá bilanci prvního i dalších vyplněných měsíců', () => {
  const transactions = [
    { id: 'tx-1', monthKey: '2026-08', type: 'expense', amount: 7000 },
    { id: 'tx-2', monthKey: '2026-10', type: 'income', amount: 5000 },
    { id: 'tx-3', monthKey: '2026-10', type: 'expense', amount: 2000 },
    { id: 'tx-4', monthKey: '2026-12', type: 'expense', amount: 4000 }
  ];

  const trend = buildBudgetTrend(['2026-07', '2026-08', '2026-10', '2026-12'], [], transactions);

  assert.deepEqual(trend.map((item) => item.monthKey), ['2026-08', '2026-10', '2026-12']);
  assert.deepEqual(trend.map((item) => item.cumulativeBalance), [-7000, -4000, -8000]);
});

test('normalizace transakce přijme reálná pole z databáze a zachová zobrazení v rozpočtu', () => {
  const normalized = normalizeTransaction({
    id: 'tx-db-1',
    month_key: '2026-09',
    category_id: 'cat-22',
    category_name: 'Potraviny',
    transaction_type: 'expense',
    amount: 1250,
    transaction_date: '2026-09-12',
    description: 'Albert',
    source: 'Albert'
  }, '2026-09');

  assert.equal(normalized.monthKey, '2026-09');
  assert.equal(normalized.categoryId, 'cat-22');
  assert.equal(normalized.categoryName, 'Potraviny');
  assert.equal(normalized.type, 'expense');
  assert.equal(normalized.amount, 1250);
  assert.equal(normalized.date, '2026-09-12');
});

test('měsíc transakce se při načtení odvodí z data i při nesouladu s month_key', () => {
  const normalized = normalizeTransaction({
    month_key: '2026-10',
    transaction_date: '2026-09-12'
  });

  assert.equal(normalized.monthKey, '2026-09');
});

test('transakce lze filtrovat podle typu, kategorie a hledaného textu', () => {
  const categories = [
    { id: 'food', name: 'Potraviny' },
    { id: 'salary', name: 'Mzda' }
  ];
  const transactions = [
    { id: 'tx-1', categoryId: 'food', type: 'expense', description: 'Nákup', source: 'Albert', date: '2026-09-05', amount: 1250 },
    { id: 'tx-2', categoryId: 'salary', type: 'income', description: 'Výplata', source: 'Zaměstnavatel', date: '2026-09-01', amount: 35000 }
  ];

  const filtered = filterTransactions(transactions, categories, {
    query: 'albert',
    type: 'expense',
    categoryId: 'food'
  });

  assert.deepEqual(filtered.map((transaction) => transaction.id), ['tx-1']);
  assert.deepEqual(filterTransactions(transactions, categories, { query: '35000' }).map((transaction) => transaction.id), ['tx-2']);
});
