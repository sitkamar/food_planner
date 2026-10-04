(function initializeBudgetModule(globalScope) {
  const DEFAULT_CURRENCY = 'CZK';

  function normalizeNumber(value, fallback = 0) {
    const numericValue = Number(value ?? fallback);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  function getMonthKey(date = new Date()) {
    const safeDate = date instanceof Date ? date : new Date(date);
    const normalized = new Date(safeDate);
    normalized.setHours(0, 0, 0, 0);

    const year = normalized.getFullYear();
    const month = String(normalized.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function getDaysInMonth(monthKey) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || '').trim());
    if (!match) {
      return 31;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) {
      return 31;
    }

    return new Date(year, month, 0).getDate();
  }

  function formatMonthLabel(monthKey) {
    const key = String(monthKey || getMonthKey()).trim();
    const [year, month] = key.split('-');

    if (!year || !month) {
      return key || 'Měsíc';
    }

    const safeDate = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat('cs-CZ', {
      month: 'long',
      year: 'numeric'
    }).format(safeDate);
  }

  function createDefaultMonthState(monthKey = getMonthKey()) {
    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      currency: DEFAULT_CURRENCY
    };
  }

  function createDefaultCategories(monthKey = getMonthKey()) {
    return [
      {
        id: `${monthKey}-income-salary`,
        monthKey,
        name: 'Mzda',
        type: 'income',
        limit: 35000,
        notes: 'Hlavní příjem',
        isActive: true
      },
      {
        id: `${monthKey}-expense-food`,
        monthKey,
        name: 'Jídlo',
        type: 'expense',
        limit: 12000,
        notes: 'Potraviny',
        isActive: true
      },
      {
        id: `${monthKey}-expense-transport`,
        monthKey,
        name: 'Doprava',
        type: 'expense',
        limit: 6000,
        notes: 'Benzín, MHD',
        isActive: true
      }
    ];
  }

  function normalizeCategory(raw = {}, fallbackMonthKey = getMonthKey()) {
    const monthKey = String(raw.monthKey || raw.month || fallbackMonthKey || getMonthKey()).trim() || getMonthKey();
    const type = raw.type === 'income' ? 'income' : 'expense';
    const name = String(raw.name || 'Nová kategorie').trim() || 'Nová kategorie';
    const generatedId = `${monthKey}-${type}-${name}`;

    return {
      id: String(raw.id || generatedId).trim() || generatedId,
      monthKey,
      name,
      type,
      limit: normalizeNumber(raw.limit ?? raw.plannedAmount ?? raw.amount ?? 0),
      notes: String(raw.notes || ''),
      isActive: raw.isActive !== false
    };
  }

  function normalizeTransaction(raw = {}, fallbackMonthKey = getMonthKey()) {
    const date = String(raw.date || raw.transaction_date || raw.transactionDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const dateMonthKey = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : '';
    const monthKey = dateMonthKey || String(raw.monthKey || raw.month || raw.month_key || fallbackMonthKey || getMonthKey()).trim() || getMonthKey();
    const type = raw.type === 'income' || raw.transaction_type === 'income' || raw.transactionType === 'income'
      ? 'income'
      : 'expense';
    const amount = Math.abs(normalizeNumber(raw.amount ?? raw.value ?? raw.total ?? 0));
    const categoryId = String(raw.categoryId || raw.category_id || raw.category || '').trim();
    const categoryName = String(raw.categoryName || raw.category_name || raw.category || '').trim();

    return {
      id: String(raw.id || `txn-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
      monthKey,
      categoryId,
      categoryName,
      type,
      amount,
      description: String(raw.description || ''),
      source: String(raw.source || ''),
      date: date.slice(0, 10)
    };
  }

  function getCategoriesForMonth(monthKey, categories = []) {
    return (Array.isArray(categories) ? categories : []).filter((category) => {
      if (!category || typeof category !== 'object') {
        return false;
      }

      return String(category.monthKey || monthKey) === String(monthKey);
    });
  }

  function getTransactionsForMonth(monthKey, transactions = []) {
    return (Array.isArray(transactions) ? transactions : []).filter((transaction) => {
      if (!transaction || typeof transaction !== 'object') {
        return false;
      }

      return String(transaction.monthKey || monthKey) === String(monthKey);
    });
  }

  function filterTransactions(transactions = [], categories = [], filters = {}) {
    const query = String(filters.query || '').trim().toLocaleLowerCase('cs-CZ');
    const type = String(filters.type || 'all');
    const categoryId = String(filters.categoryId || 'all');
    const categoryNames = new Map((Array.isArray(categories) ? categories : [])
      .map((category) => [String(category.id), String(category.name || '')]));

    return (Array.isArray(transactions) ? transactions : []).filter((transaction) => {
      if (!transaction || typeof transaction !== 'object') {
        return false;
      }

      if (type !== 'all' && transaction.type !== type) {
        return false;
      }

      if (categoryId !== 'all' && String(transaction.categoryId || '') !== categoryId) {
        return false;
      }

      if (!query) {
        return true;
      }

      const categoryName = categoryNames.get(String(transaction.categoryId || '')) || transaction.categoryName || '';
      const searchableText = [
        categoryName,
        transaction.description,
        transaction.source,
        transaction.date,
        transaction.amount
      ].join(' ').toLocaleLowerCase('cs-CZ');

      return searchableText.includes(query);
    });
  }

  function computeCategoryUsage(category, transactions = []) {
    const categoryId = category?.id ? String(category.id) : '';
    const categoryName = String(category?.name || '').trim();
    const totalUsed = (Array.isArray(transactions) ? transactions : []).reduce((sum, transaction) => {
      if (!transaction || typeof transaction !== 'object') {
        return sum;
      }

      if (transaction.type !== 'expense' && transaction.type !== 'income') {
        return sum;
      }

      const matchesCategory = transaction.categoryId
        ? String(transaction.categoryId) === categoryId
        : String(transaction.categoryName || '').trim() === categoryName;

      if (!matchesCategory) {
        return sum;
      }

      if (transaction.type === 'expense') {
        return sum + normalizeNumber(transaction.amount, 0);
      }

      return sum;
    }, 0);

    const limit = normalizeNumber(category?.limit ?? 0);
    const usageRatio = limit > 0 ? totalUsed / limit : 0;

    return {
      ...category,
      totalUsed,
      limit,
      remaining: limit - totalUsed,
      usageRatio,
      isOverBudget: limit > 0 && totalUsed > limit,
      isWarning: limit > 0 && totalUsed >= limit * 0.7 && totalUsed <= limit
    };
  }

  function computeBudgetSummary(monthKey, categories = [], transactions = []) {
    const monthCategories = getCategoriesForMonth(monthKey, categories);
    const monthTransactions = getTransactionsForMonth(monthKey, transactions);

    const totalPlannedIncome = monthCategories
      .filter((category) => category.type === 'income')
      .reduce((sum, category) => sum + normalizeNumber(category.limit, 0), 0);

    const totalPlannedExpenses = monthCategories
      .filter((category) => category.type === 'expense')
      .reduce((sum, category) => sum + normalizeNumber(category.limit, 0), 0);

    const totalActualIncome = monthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + normalizeNumber(transaction.amount, 0), 0);

    const totalActualExpenses = monthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + normalizeNumber(transaction.amount, 0), 0);

    const categoryBreakdown = monthCategories.map((category) => computeCategoryUsage(category, monthTransactions));

    const monthlyBalance = totalActualIncome - totalActualExpenses;

    return {
      monthKey,
      totalPlannedIncome,
      totalPlannedExpenses,
      totalActualIncome,
      totalActualExpenses,
      monthlyBalance,
      remainingBudget: totalPlannedIncome - totalActualExpenses,
      categoryBreakdown
    };
  }

  function buildBudgetTrend(monthKeys = [], categories = [], transactions = []) {
    const monthSet = new Set([
      ...((Array.isArray(monthKeys) ? monthKeys : []).map((item) => String(item || '').trim()).filter(Boolean)),
      ...((Array.isArray(categories) ? categories : []).map((category) => String(category?.monthKey || category?.month || '')).filter(Boolean)),
      ...((Array.isArray(transactions) ? transactions : []).map((transaction) => String(transaction?.monthKey || transaction?.month || '')).filter(Boolean))
    ]);

    const sortedMonths = Array.from(monthSet).sort((left, right) => String(left).localeCompare(String(right)));
    const filledMonths = sortedMonths.filter((monthKey) => getTransactionsForMonth(monthKey, transactions).length > 0);
    let cumulativeBalance = 0;

    return filledMonths.map((monthKey) => {
      const summary = computeBudgetSummary(monthKey, categories, transactions);
      cumulativeBalance += summary.monthlyBalance;

      const monthDate = new Date(Number(monthKey.split('-')[0]), Number(monthKey.split('-')[1]) - 1, 1);
      return {
        monthKey,
        label: new Intl.DateTimeFormat('cs-CZ', { month: 'short' }).format(monthDate).slice(0, 3),
        year: monthDate.getFullYear(),
        planned: Math.max(summary.totalPlannedIncome - summary.totalPlannedExpenses, 0),
        spent: summary.totalActualExpenses,
        income: summary.totalActualIncome,
        balance: summary.monthlyBalance,
        cumulativeBalance
      };
    });
  }

  function buildBudgetAlerts(summary = {}, categories = [], transactions = []) {
    const nextSummary = summary && typeof summary === 'object' ? summary : computeBudgetSummary(
      getMonthKey(),
      categories,
      transactions
    );

    const alerts = [];

    (nextSummary.categoryBreakdown || []).forEach((category) => {
      if (category.limit > 0 && category.totalUsed > category.limit) {
        alerts.push({
          level: 'critical',
          categoryId: category.id,
          categoryName: category.name,
          message: `${category.name} je překročeno o ${Math.round((category.totalUsed - category.limit) * 100) / 100} CZK.`
        });
      } else if (category.limit > 0 && category.totalUsed >= category.limit * 0.7) {
        alerts.push({
          level: 'warning',
          categoryId: category.id,
          categoryName: category.name,
          message: `${category.name} dosáhlo ${Math.round((category.totalUsed / category.limit) * 100)} % rozpočtu.`
        });
      }
    });

    if (nextSummary.monthlyBalance < 0) {
      alerts.push({
        level: 'critical',
        categoryId: null,
        categoryName: 'Celkový zůstatek',
        message: `Celkový zůstatek je záporný: ${Math.round(nextSummary.monthlyBalance)} CZK.`
      });
    }

    if (nextSummary.totalActualExpenses > nextSummary.totalPlannedExpenses && nextSummary.totalPlannedExpenses > 0) {
      alerts.push({
        level: 'warning',
        categoryId: null,
        categoryName: 'Celkový rozpočet',
        message: `Celkové výdaje jsou nad plánem o ${Math.round(nextSummary.totalActualExpenses - nextSummary.totalPlannedExpenses)} CZK.`
      });
    }

    return alerts;
  }

  const api = {
    DEFAULT_CURRENCY,
    formatMonthLabel,
    getMonthKey,
    getDaysInMonth,
    createDefaultMonthState,
    createDefaultCategories,
    normalizeCategory,
    normalizeTransaction,
    computeBudgetSummary,
    buildBudgetTrend,
    buildBudgetAlerts,
    getCategoriesForMonth,
    getTransactionsForMonth,
    filterTransactions
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.BudgetLogic = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
