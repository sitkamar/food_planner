const foodCatalog = [];

const defaultFreezerItems = [];

const defaultStockItems = [];

function purgePrototypeInventoryFixtures() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const fixtureNames = new Set([
    'Lasagne',
    'Kuřecí rizoto',
    'Guláš',
    'Mleté maso',
    'Kuřecí prsa',
    'Mražená zelenina',
    'Chléb'
  ]);

  ['food_planner_freezer_items', 'food_planner_stock_items'].forEach((storageKey) => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      const hasFixtureItem = parsed.some((item) => item && typeof item === 'object' && fixtureNames.has(String(item.name || '')));
      if (hasFixtureItem) {
        window.localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('Nepodařilo se vyčistit demo data inventáře:', error);
    }
  });
}

function normalizeInventoryItem(item, type = 'freezer') {
  const source = item && typeof item === 'object' ? item : {};
  const quantityValue = Number(source.quantity ?? source.qty ?? 0);
  const normalizedQuantity = Number.isFinite(quantityValue) ? Math.max(0, quantityValue) : 0;
  const fallbackUnit = type === 'stock' ? 'kg' : 'porce';

  const foodIdValue = Number(source.food_id ?? source.foodId ?? 0);
  const shouldKeepFoodLink = type === 'freezer';

  return {
    id: source.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    food_id: shouldKeepFoodLink && Number.isFinite(foodIdValue) && foodIdValue > 0 ? foodIdValue : null,
    name: String(source.name || 'Bez názvu').trim() || 'Bez názvu',
    quantity: normalizedQuantity,
    unit: String(source.unit || source.qtyUnit || fallbackUnit).trim() || fallbackUnit,
    addedAt: source.addedAt || source.date || source.createdAt || new Date().toISOString().slice(0, 10),
    expiresAt: source.expiresAt || source.expirationDate || '',
    category: source.category || '',
    notes: source.notes || '',
    type
  };
}

function readInventoryList(storageKey, fallbackList, type = 'freezer') {
  const fallback = Array.isArray(fallbackList) ? fallbackList.map((item) => normalizeInventoryItem(item, type)) : [];

  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return parsed.map((item) => normalizeInventoryItem(item, type));
  } catch (error) {
    console.warn('Nepodařilo se načíst inventář z localStorage:', error);
    return fallback;
  }
}

function saveInventoryList(storageKey, items) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items.map((item) => normalizeInventoryItem(item, item.type || (storageKey.includes('freezer') ? 'freezer' : 'stock')))));
  } catch (error) {
    console.warn('Nepodařilo se uložit inventář do localStorage:', error);
  }
}

function addInventoryItem(list, item) {
  const nextList = [...(Array.isArray(list) ? list : [])];
  const inventoryType = item?.type || 'freezer';
  const normalized = normalizeInventoryItem({
    ...item,
    id: item?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    food_id: inventoryType === 'freezer' ? (item?.food_id ?? item?.foodId ?? null) : null,
    quantity: Number(item?.quantity ?? item?.qty ?? 0),
    unit: item?.unit || item?.qtyUnit || 'ks'
  }, inventoryType);

  if (!normalized.name || normalized.name === 'Bez názvu') {
    return nextList;
  }

  nextList.push(normalized);
  return nextList;
}

function getInventoryStep(inventoryType = 'freezer') {
  return inventoryType === 'stock' ? 0.1 : 1;
}

function updateInventoryQuantity(list, itemId, delta, inventoryType = 'freezer') {
  const numericDelta = Number(delta || 0);
  const step = getInventoryStep(inventoryType);
  const safeDelta = Number.isFinite(numericDelta) && Math.abs(numericDelta) > 0 ? numericDelta : step;

  return (Array.isArray(list) ? list : []).map((item) => {
    if (Number(item.id) !== Number(itemId)) {
      return item;
    }

    const baseQuantity = Number(item.quantity ?? 0);
    const nextQuantity = Math.max(0, baseQuantity + safeDelta);
    return { ...item, quantity: Number.isFinite(nextQuantity) ? Number(nextQuantity.toFixed(1)) : 0 };
  });
}

function findInventoryItemByReference(list, itemId, targetNode = null) {
  const normalizedId = String(itemId ?? '').trim();
  const matchById = (Array.isArray(list) ? list : []).find((item) => String(item.id) === normalizedId);

  if (matchById) {
    return matchById;
  }

  if (!targetNode || typeof targetNode.closest !== 'function') {
    return null;
  }

  const itemRow = targetNode.closest('li');
  if (!itemRow) {
    return null;
  }

  const label = itemRow.querySelector('strong')?.textContent?.trim() || '';
  if (!label) {
    return null;
  }

  return (Array.isArray(list) ? list : []).find((item) => String(item.name || '').trim() === label) || null;
}

function getInventorySummary(inventoryState = {}) {
  const freezerList = Array.isArray(inventoryState.freezer) ? inventoryState.freezer : [];
  const stockList = Array.isArray(inventoryState.stock) ? inventoryState.stock : [];

  return {
    freezerCount: freezerList.length,
    stockCount: stockList.length,
    freezerPortions: freezerList.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    stockUnits: stockList.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  };
}

purgePrototypeInventoryFixtures();

const freezerItems = readInventoryList('food_planner_freezer_items', defaultFreezerItems, 'freezer');
const stockItems = readInventoryList('food_planner_stock_items', defaultStockItems, 'stock');
const budgetLogic = (typeof window !== 'undefined' && window.BudgetLogic) || (typeof require === 'function' ? require('./budget.js') : {});
const budgetStorageKey = 'food_planner_budget_state_v1';

function getDefaultBudgetState() {
  const currentMonth = budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : '2026-09';
  const categories = budgetLogic.createDefaultCategories ? budgetLogic.createDefaultCategories(currentMonth) : [];

  return {
    selectedMonth: currentMonth,
    categories,
    transactions: []
  };
}

function loadBudgetState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getDefaultBudgetState();
  }

  try {
    const raw = window.localStorage.getItem(budgetStorageKey);
    if (!raw) {
      return getDefaultBudgetState();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return getDefaultBudgetState();
    }

    const selectedMonth = budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : parsed.selectedMonth || '2026-09';
    const categories = Array.isArray(parsed.categories) ? parsed.categories.map((category) => budgetLogic.normalizeCategory ? budgetLogic.normalizeCategory(category, selectedMonth) : category) : getDefaultBudgetState().categories;
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions.map((transaction) => budgetLogic.normalizeTransaction ? budgetLogic.normalizeTransaction(transaction, selectedMonth) : transaction) : [];

    return {
      selectedMonth: String(parsed.selectedMonth || selectedMonth),
      categories,
      transactions
    };
  } catch (error) {
    console.warn('Nepodařilo se načíst rozpočet z localStorage:', error);
    return getDefaultBudgetState();
  }
}

function persistBudgetState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(budgetStorageKey, JSON.stringify(budgetState));
  } catch (error) {
    console.warn('Nepodařilo se uložit rozpočet do localStorage:', error);
  }
}

const budgetState = loadBudgetState();

async function loadBudgetFromServer(monthKey = budgetState.selectedMonth) {
  try {
    const query = monthKey ? `?month_key=${encodeURIComponent(monthKey)}` : '';
    const response = await fetch(`/api/budget${query}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || 'Nepodařilo se načíst rozpočet z databáze.');
    }

    const categories = Array.isArray(payload.categories)
      ? payload.categories.map((category) => {
          const monthKey = String(category.month_key || category.monthKey || budgetState.selectedMonth || (budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : '2026-09')).trim();
          const normalized = budgetLogic.normalizeCategory ? budgetLogic.normalizeCategory({
            id: category.id,
            monthKey,
            name: category.name,
            type: category.type,
            limit: category.planned_amount ?? category.limit ?? 0,
            notes: category.notes || '',
            isActive: category.is_active !== false
          }, monthKey) : {
            id: category.id,
            monthKey,
            name: category.name,
            type: category.type,
            limit: Number(category.planned_amount ?? category.limit ?? 0),
            notes: category.notes || '',
            isActive: category.is_active !== false
          };
          return normalized;
        })
      : [];

    const transactions = Array.isArray(payload.transactions)
      ? payload.transactions.map((transaction) => {
          const monthKey = String(transaction.month_key || transaction.monthKey || budgetState.selectedMonth || (budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : '2026-09')).trim();
          const normalized = budgetLogic.normalizeTransaction ? budgetLogic.normalizeTransaction({
            id: transaction.id,
            monthKey,
            categoryId: transaction.category_id || transaction.categoryId || '',
            categoryName: transaction.category_name || transaction.categoryName || '',
            type: transaction.transaction_type || transaction.type || 'expense',
            amount: transaction.amount,
            description: transaction.description || '',
            source: transaction.source || '',
            date: transaction.transaction_date || transaction.date || new Date().toISOString().slice(0, 10)
          }, monthKey) : {
            id: transaction.id,
            monthKey,
            categoryId: transaction.category_id || transaction.categoryId || '',
            categoryName: transaction.category_name || transaction.categoryName || '',
            type: transaction.transaction_type || transaction.type || 'expense',
            amount: Number(transaction.amount || 0),
            description: transaction.description || '',
            source: transaction.source || '',
            date: transaction.transaction_date || transaction.date || new Date().toISOString().slice(0, 10)
          };
          return normalized;
        })
      : [];

    budgetState.categories = categories;
    budgetState.transactions = transactions;

    if (!budgetState.selectedMonth) {
      budgetState.selectedMonth = budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : '2026-09';
    }

    if (budgetState.categories.length || budgetState.transactions.length) {
      renderBudgetView();
    }

    return true;
  } catch (error) {
    console.warn('Nepodařilo se načíst rozpočet z databáze:', error);
    return false;
  }
}

async function saveBudgetCategoryToServer(payload, categoryId = '') {
  if (typeof window === 'undefined' || !window.fetch) {
    return null;
  }

  const endpoint = categoryId ? `/api/budget/categories/${categoryId}` : '/api/budget/categories';
  const response = await fetch(endpoint, {
    method: categoryId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Nepodařilo se uložit kategorii.');
  }

  return result;
}

async function saveBudgetTransactionToServer(payload, transactionId = '') {
  if (typeof window === 'undefined' || !window.fetch) {
    return null;
  }

  const endpoint = transactionId ? `/api/budget/transactions/${transactionId}` : '/api/budget/transactions';
  const response = await fetch(endpoint, {
    method: transactionId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Nepodařilo se uložit transakci.');
  }

  return result;
}

async function deleteBudgetTransactionFromServer(transactionId) {
  if (!transactionId || typeof window === 'undefined' || !window.fetch) {
    return false;
  }

  const response = await fetch(`/api/budget/transactions/${transactionId}`, { method: 'DELETE' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Nepodařilo se smazat transakci.');
  }

  return true;
}

const SLOT_GROUPS = [
  { key: 'breakfast', label: 'Snídaně', supercategory: 'Snídaně' },
  { key: 'main', label: 'Vaření', supercategory: 'Hlavní jídlo' },
  { key: 'snack', label: 'Svačina', supercategory: 'Snack' },
  { key: 'non_cooking', label: 'Nevařící', supercategory: 'Nevaření' }
];

function createDefaultSlotGroups() {
  return SLOT_GROUPS.reduce((groups, group) => {
    groups[group.key] = [`${group.key}_1`];
    return groups;
  }, {});
}

function getSlotGroupDefinition(groupKey) {
  return SLOT_GROUPS.find((group) => group.key === groupKey) || null;
}

function getSlotDefinition(slotKey) {
  const match = /^([a-z_]+)_(\d+)$/.exec(slotKey || '');

  if (!match) {
    return null;
  }

  const [, groupKey, indexText] = match;
  const groupDefinition = getSlotGroupDefinition(groupKey);

  if (!groupDefinition) {
    return null;
  }

  return {
    groupKey,
    slotIndex: Number(indexText),
    label: `${groupDefinition.label} ${indexText}`,
    supercategory: groupDefinition.supercategory
  };
}

function ensureWeekSlotState(week) {
  const defaultGroups = createDefaultSlotGroups();

  if (!week || typeof week !== 'object') {
    return;
  }

  week.slots = week.slots || {};
  week.items = week.items || {};
  week.foodIds = week.foodIds || {};

  SLOT_GROUPS.forEach((group) => {
    const groupSlots = Array.isArray(week.slots[group.key]) ? week.slots[group.key] : defaultGroups[group.key];

    week.slots[group.key] = groupSlots
      .filter((slotKey) => !!getSlotDefinition(slotKey) && getSlotDefinition(slotKey).groupKey === group.key)
      .filter((slotKey, index, slots) => slots.indexOf(slotKey) === index);

    if (!week.slots[group.key].length) {
      week.slots[group.key] = [...defaultGroups[group.key]];
    }

    week.slots[group.key].forEach((slotKey) => {
      if (!(slotKey in week.items)) {
        week.items[slotKey] = '';
      }

      if (!(slotKey in week.foodIds)) {
        week.foodIds[slotKey] = null;
      }
    });
  });

  Object.keys(week.items).forEach((slotKey) => {
    if (!getSlotDefinition(slotKey)) {
      delete week.items[slotKey];
    }
  });

  Object.keys(week.foodIds).forEach((slotKey) => {
    if (!getSlotDefinition(slotKey)) {
      delete week.foodIds[slotKey];
    }
  });
}

function getWeekSlotEntries(week) {
  ensureWeekSlotState(week);

  return SLOT_GROUPS.flatMap((group) => (week.slots[group.key] || []).map((slotKey) => ({
    slotKey,
    groupKey: group.key,
    definition: getSlotDefinition(slotKey)
  })));
}

function removeSlotFromWeek(week, groupKey, slotKey) {
  if (!week || !groupKey || !slotKey) {
    return false;
  }

  const currentSlots = Array.isArray(week.slots?.[groupKey]) ? week.slots[groupKey] : [];

  if (!currentSlots.includes(slotKey)) {
    return false;
  }

  week.slots[groupKey] = currentSlots.filter((entry) => entry !== slotKey);
  delete week.items?.[slotKey];
  delete week.foodIds?.[slotKey];
  ensureWeekSlotState(week);
  return true;
}

function serializeWeekForServer(week) {
  ensureWeekSlotState(week);

  return SLOT_GROUPS.flatMap((group) => {
    const slotKeys = Array.isArray(week.slots?.[group.key]) && week.slots[group.key].length
      ? week.slots[group.key]
      : [`${group.key}_1`];

    return slotKeys.map((slotKey) => {
      const foodName = String(week.items?.[slotKey] || '').trim();
      const foodIdValue = Number(week.foodIds?.[slotKey]);

      return {
        slot_group: group.key,
        slot_index: getSlotDefinition(slotKey)?.slotIndex || 1,
        food_id: Number.isFinite(foodIdValue) && foodIdValue > 0 ? foodIdValue : null,
        food_name: foodName
      };
    });
  });
}

function buildFoodSubmissionPayload(input = {}) {
  const name = String(input.name || '').trim();
  const supercategory = String(input.supercategory || '').trim() || 'Hlavní jídlo';
  const category = String(input.category || '').trim() || 'vlastní';
  const subcategory = String(input.subcategory || '').trim();
  const foodType = String(input.foodType || input.food_type_name || '').trim();

  const payload = {
    name,
    supercategory,
    category
  };

  if (subcategory) {
    payload.subcategory = subcategory;
  }

  if (foodType) {
    payload.food_type_name = foodType;
  }

  return payload;
}

async function saveWeekPlan(week) {
  if (!week?.startDate) {
    return null;
  }

  try {
    const payload = {
      week_start_date: week.startDate,
      slots: serializeWeekForServer(week)
    };

    const response = await fetch('/api/weekly-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || 'Nepodařilo se uložit plán týdne.');
    }

    return result;
  } catch (error) {
    console.error('Chyba při ukládání týdenního plánu:', error);
    return null;
  }
}

async function fetchWeeklyPlansForDates(weekDates = [], targetWeeks = weekPlanData) {
  const dates = Array.from(new Set((weekDates || []).filter(Boolean)));

  if (!dates.length) {
    return [];
  }

  try {
    const results = await Promise.all(
      dates.map(async (startDate) => {
        const response = await fetch(`/api/weekly-plans?week_start_date=${encodeURIComponent(startDate)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || 'Nepodařilo se načíst týdenní plán.');
        }

        return Array.isArray(payload.items) ? payload.items : [];
      })
    );

    const merged = results.flat();
    hydrateSavedWeekData(merged, targetWeeks);
    renderWeekPlan();
    return merged;
  } catch (error) {
    console.error('Chyba při načítání uložených plánů:', error);
    return [];
  }
}

async function loadSavedWeeklyPlans() {
  return fetchWeeklyPlansForDates(
    (weekPlanData || []).map((week) => week.startDate),
    weekPlanData
  );
}

function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfWeek(dateInput) {
  const date = new Date(dateInput instanceof Date ? dateInput : new Date(dateInput));
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  const day = normalizedDate.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  normalizedDate.setDate(normalizedDate.getDate() + diffToMonday);

  return normalizedDate;
}

function createEmptyWeek(startDate) {
  const emptySlots = createDefaultSlotGroups();

  return {
    startDate,
    slots: {
      breakfast: [...emptySlots.breakfast],
      main: [...emptySlots.main],
      snack: [...emptySlots.snack],
      non_cooking: [...emptySlots.non_cooking]
    },
    items: {
      breakfast_1: '',
      main_1: '',
      snack_1: '',
      non_cooking_1: ''
    },
    foodIds: {
      breakfast_1: null,
      main_1: null,
      snack_1: null,
      non_cooking_1: null
    }
  };
}

function buildVisibleWeekWindow(baseStartDate) {
  const referenceDate = baseStartDate instanceof Date
    ? getStartOfWeek(baseStartDate)
    : getStartOfWeek(new Date(`${baseStartDate}T00:00:00`));

  const nextWeekDate = new Date(referenceDate);
  nextWeekDate.setDate(referenceDate.getDate() + 7);

  const nextNextWeekDate = new Date(referenceDate);
  nextNextWeekDate.setDate(referenceDate.getDate() + 14);

  return [
    createEmptyWeek(formatISODate(referenceDate)),
    createEmptyWeek(formatISODate(nextWeekDate)),
    createEmptyWeek(formatISODate(nextNextWeekDate))
  ];
}

function shiftVisibleWeeks(weeks, offsetWeeks) {
  if (!Array.isArray(weeks) || !weeks.length) {
    return [];
  }

  return weeks.map((week) => {
    const date = new Date(`${week.startDate}T00:00:00`);
    date.setDate(date.getDate() + (offsetWeeks * 7));

    const shiftedDate = formatISODate(date);
    const existingWeek = Array.isArray(globalThis.weekPlanData) && globalThis.weekPlanData.find((item) => item.startDate === shiftedDate);

    if (existingWeek) {
      return JSON.parse(JSON.stringify(existingWeek));
    }

    return createEmptyWeek(shiftedDate);
  });
}

function hydrateSavedWeekData(savedWeeks, visibleWeeks = weekPlanData) {
  const weekMap = new Map((visibleWeeks || []).map((week) => [week.startDate, week]));

  (savedWeeks || []).forEach((weekData) => {
    const startDate = weekData.week_start_date;
    const targetWeek = weekMap.get(startDate) || createEmptyWeek(startDate);

    if (!weekMap.has(startDate)) {
      visibleWeeks.push(targetWeek);
      weekMap.set(startDate, targetWeek);
    }

    targetWeek.items = targetWeek.items || {};
    targetWeek.foodIds = targetWeek.foodIds || {};
    targetWeek.slots = targetWeek.slots || createDefaultSlotGroups();

    SLOT_GROUPS.forEach((group) => {
      const incomingSlots = Array.isArray(weekData.slots?.[group.key]) ? weekData.slots[group.key] : [`${group.key}_1`];
      const validSlots = incomingSlots.filter((slotKey) => getSlotDefinition(slotKey)?.groupKey === group.key);
      targetWeek.slots[group.key] = validSlots.length ? validSlots : [`${group.key}_1`];
    });

    Object.entries(weekData.items || {}).forEach(([slotKey, foodName]) => {
      if (getSlotDefinition(slotKey)) {
        targetWeek.items[slotKey] = String(foodName || '').trim();
      }
    });

    if (weekData.food_ids && typeof weekData.food_ids === 'object') {
      Object.entries(weekData.food_ids).forEach(([slotKey, foodId]) => {
        if (getSlotDefinition(slotKey)) {
          const numericId = Number(foodId);
          targetWeek.foodIds[slotKey] = Number.isFinite(numericId) && numericId > 0 ? numericId : null;
        }
      });
    }

    ensureWeekSlotState(targetWeek);
  });

  return visibleWeeks;
}

const weekPlanData = buildVisibleWeekWindow(getStartOfWeek(new Date()));

function updateVisibleWeekWindow(baseDate) {
  const nextWindow = buildVisibleWeekWindow(baseDate);
  weekPlanData.length = 0;
  weekPlanData.push(...nextWindow);

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    fetchWeeklyPlansForDates(nextWindow.map((week) => week.startDate), weekPlanData);
  }

  renderWeekPlan();
}

function moveVisibleWeeks(offsetWeeks) {
  const currentBaseDate = weekPlanData[0]?.startDate || formatISODate(getStartOfWeek(new Date()));
  const baseDate = new Date(`${currentBaseDate}T00:00:00`);
  baseDate.setDate(baseDate.getDate() + (offsetWeeks * 7));

  updateVisibleWeekWindow(baseDate);
}

function jumpToToday() {
  const today = getStartOfWeek(new Date());
  const nextWindow = buildVisibleWeekWindow(today);
  weekPlanData.length = 0;
  weekPlanData.push(...nextWindow);

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    fetchWeeklyPlansForDates(nextWindow.map((week) => week.startDate), weekPlanData);
  }

  renderWeekPlan();
}

const weekPlanEl = document.getElementById('weekPlan');
const foodCatalogEl = document.getElementById('foodCatalog');
const freezerListEl = document.getElementById('freezerList');
const stockListEl = document.getElementById('stockList');
const foodForm = document.getElementById('foodForm');
const foodSupercategorySelect = document.getElementById('foodSupercategory');
const foodSearch = document.getElementById('foodSearch');
const navButtons = document.querySelectorAll('.nav-item');
const appSwitchButtons = document.querySelectorAll('.app-switch-btn');
const moduleNavs = document.querySelectorAll('.module-nav');
const freezerForm = document.getElementById('freezerForm');
const stockForm = document.getElementById('stockForm');
const freezerSupercategory = document.getElementById('freezerSupercategory');
const freezerCategory = document.getElementById('freezerCategory');
const freezerSubcategory = document.getElementById('freezerSubcategory');
const freezerSearch = document.getElementById('freezerSearch');
const freezerFoodList = document.getElementById('freezerFoodList');
const summaryFreezerEl = document.getElementById('summaryFreezer');
const summaryStockEl = document.getElementById('summaryStock');
const foodPickerModal = document.getElementById('foodPickerModal');
const foodPickerSupercategory = document.getElementById('foodPickerSupercategory');
const foodPickerCategory = document.getElementById('foodPickerCategory');
const foodPickerSubcategory = document.getElementById('foodPickerSubcategory');
const foodPickerSearch = document.getElementById('foodPickerSearch');
const foodPickerList = document.getElementById('foodPickerList');
const foodPickerTitle = document.getElementById('foodPickerTitle');
const clearFoodSelectionBtn = document.getElementById('clearFoodSelectionBtn');

const foodPickerState = {
  weekStart: null,
  slotKey: null
};

const budgetMonthPicker = document.getElementById('budgetMonthPicker');
const budgetSummaryCards = document.getElementById('budgetSummaryCards');
const budgetCategoryForm = document.getElementById('budgetCategoryForm');
const budgetCategoryList = document.getElementById('budgetCategoryList');
const budgetTransactionForm = document.getElementById('budgetTransactionForm');
const budgetTransactionList = document.getElementById('budgetTransactionList');
const budgetTransactionCategory = document.getElementById('budgetTransactionCategory');
const budgetAlertList = document.getElementById('budgetAlertList');
const budgetPrevMonthBtn = document.getElementById('budgetPrevMonthBtn');
const budgetNextMonthBtn = document.getElementById('budgetNextMonthBtn');
const budgetChart = document.getElementById('budgetChart');
const budgetCategoryIdInput = document.getElementById('budgetCategoryId');
const budgetTransactionIdInput = document.getElementById('budgetTransactionId');
const budgetCategorySubmitBtn = document.getElementById('budgetCategorySubmitBtn');
const budgetTransactionSubmitBtn = document.getElementById('budgetTransactionSubmitBtn');
const budgetTrendChart = document.getElementById('budgetTrendChart');

let availableSupercategories = [];

function normalizeSupercategory(value = '') {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z]/g, '');
}

function matchesSupercategory(foodSupercategory, expectedSupercategory) {
  const normalizedFood = normalizeSupercategory(foodSupercategory);
  const normalizedExpected = normalizeSupercategory(expectedSupercategory);

  if (!normalizedFood || !normalizedExpected) {
    return false;
  }

  if (normalizedFood === normalizedExpected) {
    return true;
  }

  const aliases = {
    snidane: ['snidane', 'breakfast'],
    hlavnijidlo: ['hlavnijidlo', 'mainmeal', 'main'],
    priloha: ['priloha', 'side'],
    snack: ['snack', 'svacina', 'snacky'],
    nevari: ['nevari', 'nevareni', 'eatingout', 'noncooking']
  };

  return aliases[normalizedExpected]?.includes(normalizedFood) || aliases[normalizedFood]?.includes(normalizedExpected);
}

function getFoodsForSlot(slotKey) {
  const expectedSupercategory = getSlotDefinition(slotKey)?.supercategory;

  if (!expectedSupercategory) {
    return [...foodCatalog];
  }

  return foodCatalog.filter((food) => {
    const foodType = food.foodType || food.supercategory;
    return matchesSupercategory(foodType, expectedSupercategory);
  });
}

async function loadFoodCatalog() {
  try {
    const response = await fetch('/api/foods');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || 'Nepodařilo se načíst katalog jídel.');
    }

    foodCatalog.length = 0;
    payload.items.forEach((item) => foodCatalog.push({
      id: item.id,
      name: item.name,
      supercategory: item.supercategory,
      foodType: item.foodType || item.supercategory,
      category: item.category,
      subcategory: item.subcategory,
      classification: item.classification,
      fullLabel: item.fullLabel
    }));

    populateInventoryFoodSelects();
    renderFoodCatalog();
    renderWeekPlan();
  } catch (error) {
    console.error(error);
    if (foodCatalogEl) {
      foodCatalogEl.innerHTML = '<li><div><strong>Databáze není dostupná</strong><br /><small>Nelze načíst jídelní katalog.</small></div></li>';
    }
  }
}

async function loadSupercategoryOptions() {
  if (!foodSupercategorySelect) {
    return;
  }

  try {
    const response = await fetch('/api/supercategories');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || 'Nepodařilo se načíst nadkategorie.');
    }

    availableSupercategories = Array.isArray(payload.items) ? payload.items : [];
    const selectedValue = foodSupercategorySelect.value || availableSupercategories[0]?.name || 'Hlavní jídlo';

    foodSupercategorySelect.innerHTML = availableSupercategories.length
      ? availableSupercategories.map((item) => `<option value="${item.name}" data-food-type-name="${item.food_type_name || item.name}">${item.name}</option>`).join('')
      : '<option value="Hlavní jídlo" data-food-type-name="Hlavní jídlo">Hlavní jídlo</option>';

    foodSupercategorySelect.value = availableSupercategories.some((item) => item.name === selectedValue)
      ? selectedValue
      : (availableSupercategories[0]?.name || 'Hlavní jídlo');
  } catch (error) {
    console.error(error);
    foodSupercategorySelect.innerHTML = '<option value="Hlavní jídlo">Hlavní jídlo</option>';
    foodSupercategorySelect.value = 'Hlavní jídlo';
  }
}

function renderFoodCatalog() {
  if (!foodCatalogEl) {
    return;
  }

  const query = (foodSearch?.value || '').trim().toLowerCase();
  const visibleFoods = !query
    ? [...foodCatalog]
    : foodCatalog.filter((food) => {
        const haystack = `${food.name} ${food.category || ''} ${food.supercategory || ''} ${food.subcategory || ''}`.toLowerCase();
        return haystack.includes(query);
      });

  if (!visibleFoods.length) {
    foodCatalogEl.innerHTML = '<li><div><strong>Žádná jídla</strong><br /><small>Pro aktuální hledání nebyla nalezena žádná položka.</small></div></li>';
    return;
  }

  foodCatalogEl.innerHTML = visibleFoods
    .map(
      (food) => `
        <li>
          <div>
            <strong>${food.name}</strong><br />
            <small>${food.fullLabel || food.classification || food.supercategory || 'Bez kategorie'}</small>
          </div>
          <button class="secondary" type="button">Přidat</button>
        </li>
      `
    )
    .join('');
}

function renderInventorySummary() {
  const summary = getInventorySummary({ freezer: freezerItems, stock: stockItems });

  if (summaryFreezerEl) {
    summaryFreezerEl.textContent = `${summary.freezerPortions} porce`;
  }

  if (summaryStockEl) {
    summaryStockEl.textContent = `${summary.stockCount} položek`;
  }
}

function renderFreezerFoodSelection() {
  if (!freezerSupercategory || !freezerCategory || !freezerSubcategory || !freezerFoodList || !freezerSearch) {
    return;
  }

  const selectedSupercategory = freezerSupercategory.value || '';
  const selectedCategory = freezerCategory.value || '';
  const selectedSubcategory = freezerSubcategory.value || '';
  const filterState = getFoodPickerOptions(null, {
    supercategory: selectedSupercategory,
    category: selectedCategory,
    subcategory: selectedSubcategory
  });

  freezerSupercategory.innerHTML = [
    '<option value="">Všechny nadkategorie</option>',
    ...filterState.supercategories.map((name) => `<option value="${name}">${name}</option>`)
  ].join('');

  freezerCategory.innerHTML = [
    '<option value="">Všechny kategorie</option>',
    ...filterState.categories.map((name) => `<option value="${name}">${name}</option>`)
  ].join('');

  freezerSubcategory.innerHTML = [
    '<option value="">Všechny podkategorie</option>',
    ...filterState.subcategories.map((name) => `<option value="${name}">${name}</option>`)
  ].join('');

  const safeSupercategory = filterState.supercategory || '';
  const safeCategory = filterState.category || '';
  const safeSubcategory = filterState.subcategory || '';

  freezerSupercategory.value = safeSupercategory;
  freezerCategory.value = safeCategory;
  freezerSubcategory.value = safeSubcategory;

  const filteredFoods = filterFoodSelectionOptions(foodCatalog, {
    supercategory: freezerSupercategory.value || '',
    category: freezerCategory.value || '',
    subcategory: freezerSubcategory.value || '',
    query: freezerSearch.value || ''
  });

  if (!filteredFoods.length) {
    freezerFoodList.innerHTML = '<div class="selected-food-summary"><strong>Žádná jídla</strong><small>Pro tento filtr neexistuje žádná vhodná varianta.</small></div>';
    return;
  }

  freezerFoodList.innerHTML = filteredFoods
    .map((food) => {
      const meta = getFoodMeta(food);
      return `
        <button class="food-picker-item" type="button" data-food-id="${food.id ?? ''}" data-food-name="${food.name || ''}">
          <div>
            <strong>${food.name}</strong>
            <small>${meta.label}</small>
          </div>
        </button>
      `;
    })
    .join('');
}

function renderFreezerList() {
  if (!freezerListEl) {
    return;
  }

  freezerListEl.innerHTML = freezerItems.length
    ? freezerItems
        .map(
          (item) => `
            <li>
              <div>
                <strong>${item.name}</strong><br />
                <small>${item.quantity} ${item.unit}${item.food_id ? ` · food_id ${item.food_id}` : ''}${item.addedAt ? ` · uložen ${item.addedAt}` : ''}</small>
              </div>
              <div class="inventory-actions">
                <button class="inventory-qty-btn" type="button" data-inventory-type="freezer" data-item-id="${item.id}" data-inventory-action="decrement" aria-label="Ubrat jednu porci">−</button>
                <button class="inventory-qty-btn" type="button" data-inventory-type="freezer" data-item-id="${item.id}" data-inventory-action="increment" aria-label="Přidat jednu porci">+</button>
              </div>
            </li>
          `
        )
        .join('')
    : '<li><div><strong>Žádné zbytky</strong><br /><small>V mrazáku zatím není nic uloženo.</small></div></li>';

  if (typeof freezerListEl.querySelectorAll === 'function') {
    freezerListEl.querySelectorAll('.inventory-qty-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const target = event.currentTarget || button;
        const inventoryType = String(target.dataset.inventoryType || 'freezer');
        const action = String(target.dataset.inventoryAction || '');
        const itemId = String(target.dataset.itemId || '');
        const sourceList = inventoryType === 'freezer' ? freezerItems : stockItems;
        const item = findInventoryItemByReference(sourceList, itemId, target);

        if (!item || !action || !inventoryType) {
          return;
        }

        if (action === 'increment') {
          const next = updateInventoryQuantity(sourceList, item.id, getInventoryStep(inventoryType), inventoryType);
          sourceList.splice(0, sourceList.length, ...next);
          persistInventoryState();
          return;
        }

        if (action === 'decrement') {
          const next = updateInventoryQuantity(sourceList, item.id, -getInventoryStep(inventoryType), inventoryType);
          sourceList.splice(0, sourceList.length, ...next);
          persistInventoryState();
        }
      });
    });
  }

  renderInventorySummary();
}

function renderStockList() {
  if (!stockListEl) {
    return;
  }

  stockListEl.innerHTML = stockItems.length
    ? stockItems
        .map(
          (item) => `
            <li>
              <div>
                <strong>${item.name}</strong><br />
                <small>${item.quantity} ${item.unit}${item.food_id ? ` · food_id ${item.food_id}` : ''}${item.expiresAt ? ` · spotřebovat do ${item.expiresAt}` : ''}${item.category ? ` · ${item.category}` : ''}</small>
              </div>
              <div class="inventory-actions">
                <button class="inventory-qty-btn" type="button" data-inventory-type="stock" data-item-id="${item.id}" data-inventory-action="decrement" aria-label="Ubrat množství">−</button>
                <button class="inventory-qty-btn" type="button" data-inventory-type="stock" data-item-id="${item.id}" data-inventory-action="increment" aria-label="Přidat množství">+</button>
              </div>
            </li>
          `
        )
        .join('')
    : '<li><div><strong>Žádné zásoby</strong><br /><small>Nemáte zatím žádné trvanlivé ingredience.</small></div></li>';

  if (typeof stockListEl.querySelectorAll === 'function') {
    stockListEl.querySelectorAll('.inventory-qty-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const target = event.currentTarget || button;
        const inventoryType = String(target.dataset.inventoryType || 'stock');
        const action = String(target.dataset.inventoryAction || '');
        const itemId = String(target.dataset.itemId || '');
        const sourceList = inventoryType === 'freezer' ? freezerItems : stockItems;
        const item = findInventoryItemByReference(sourceList, itemId, target);

        if (!item || !action || !inventoryType) {
          return;
        }

        if (action === 'increment') {
          const next = updateInventoryQuantity(sourceList, item.id, getInventoryStep(inventoryType), inventoryType);
          sourceList.splice(0, sourceList.length, ...next);
          persistInventoryState();
          return;
        }

        if (action === 'decrement') {
          const next = updateInventoryQuantity(sourceList, item.id, -getInventoryStep(inventoryType), inventoryType);
          sourceList.splice(0, sourceList.length, ...next);
          persistInventoryState();
        }
      });
    });
  }

  renderInventorySummary();
}

function formatDate(date) {
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric'
  }).format(date);
}

function formatWeekRange(startDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${formatDate(start)} – ${formatDate(end)}`;
}

function renderWeekHeader() {
  const titleEl = document.querySelector('.topbar h1');
  if (titleEl) {
    titleEl.textContent = 'Plánování týdnů';
  }
}

function getFoodMeta(food) {
  const supercategory = food?.supercategory || 'Neurčeno';
  const category = food?.category || 'Neurčeno';
  const subcategory = food?.subcategory || null;

  return {
    supercategory,
    category,
    subcategory,
    label: [supercategory, category, subcategory].filter(Boolean).join(' · ') || 'Bez kategorie'
  };
}

function normalizeFilterText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function matchesFilterValue(actualValue, expectedValue) {
  const valueA = normalizeFilterText(actualValue);
  const valueB = normalizeFilterText(expectedValue);

  if (!valueA && !valueB) {
    return true;
  }

  if (!valueA || !valueB) {
    return false;
  }

  if (valueA === valueB) {
    return true;
  }

  const tokensA = valueA.split(/\s+/).filter(Boolean);
  const tokensB = valueB.split(/\s+/).filter(Boolean);

  if (!tokensA.length || !tokensB.length) {
    return false;
  }

  return tokensB.every((token) => tokensA.includes(token))
    || tokensA.every((token) => tokensB.includes(token));
}

function filterFoodSelectionOptions(foods, filters = {}) {
  const query = normalizeFilterText(filters.query || '');
  const supercategory = normalizeFilterText(filters.supercategory || '');
  const category = normalizeFilterText(filters.category || '');
  const subcategory = normalizeFilterText(filters.subcategory || '');

  return (foods || []).filter((food) => {
    if (supercategory && !matchesFilterValue(food.supercategory, supercategory)) {
      return false;
    }

    if (category && !matchesFilterValue(food.category, category)) {
      return false;
    }

    if (subcategory && !matchesFilterValue(food.subcategory, subcategory)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = normalizeFilterText(`${food.name || ''} ${food.supercategory || ''} ${food.category || ''} ${food.subcategory || ''}`);
    return haystack.includes(query);
  });
}

function formatCurrency(value = 0) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
  }).format(numericValue);
}

function getBudgetMonthOptions() {
  const months = new Set([budgetState.selectedMonth || (budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : '2026-09')]);

  budgetState.categories.forEach((category) => {
    if (category && category.monthKey) {
      months.add(String(category.monthKey));
    }
  });

  budgetState.transactions.forEach((transaction) => {
    if (transaction && transaction.monthKey) {
      months.add(String(transaction.monthKey));
    }
  });

  return Array.from(months).sort().reverse();
}

function renderBudgetView() {
  if (!budgetMonthPicker || !budgetSummaryCards || !budgetCategoryList || !budgetTransactionList || !budgetAlertList) {
    return;
  }

  const monthKeys = getBudgetMonthOptions();
  const currentMonth = monthKeys.includes(String(budgetState.selectedMonth))
    ? String(budgetState.selectedMonth)
    : (monthKeys[0] || (budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : '2026-09'));

  budgetState.selectedMonth = currentMonth;
  budgetMonthPicker.innerHTML = monthKeys
    .map((monthKey) => `<option value="${monthKey}">${budgetLogic.formatMonthLabel ? budgetLogic.formatMonthLabel(monthKey) : monthKey}</option>`)
    .join('');
  budgetMonthPicker.value = currentMonth;

  const summary = budgetLogic.computeBudgetSummary
    ? budgetLogic.computeBudgetSummary(currentMonth, budgetState.categories, budgetState.transactions)
    : { totalPlannedIncome: 0, totalPlannedExpenses: 0, totalActualIncome: 0, totalActualExpenses: 0, monthlyBalance: 0, remainingBudget: 0, categoryBreakdown: [] };

  budgetSummaryCards.innerHTML = `
    <div class="budget-metric summary-card accent">
      <span class="label">Plánovaný příjem</span>
      <strong>${formatCurrency(summary.totalPlannedIncome || 0)}</strong>
    </div>
    <div class="budget-metric summary-card">
      <span class="label">Plánované výdaje</span>
      <strong>${formatCurrency(summary.totalPlannedExpenses || 0)}</strong>
    </div>
    <div class="budget-metric summary-card">
      <span class="label">Skutečné výdaje</span>
      <strong>${formatCurrency(summary.totalActualExpenses || 0)}</strong>
    </div>
    <div class="budget-metric summary-card">
      <span class="label">Zůstatek</span>
      <strong>${formatCurrency(summary.monthlyBalance || 0)}</strong>
    </div>
  `;

  const monthCategories = Array.isArray(budgetState.categories) ? budgetState.categories : [];
  const selectedCategoryOptions = monthCategories.filter((category) => category.type === 'expense' || category.type === 'income');

  if (budgetTransactionCategory) {
    budgetTransactionCategory.innerHTML = selectedCategoryOptions.length
      ? selectedCategoryOptions.map((category) => `<option value="${category.id}">${category.name}</option>`).join('')
      : '<option value="">Žádné kategorie</option>';
  }

  budgetCategoryList.innerHTML = monthCategories.length
    ? monthCategories.map((category) => {
        const usage = summary.categoryBreakdown.find((item) => item.id === category.id) || { totalUsed: 0, remaining: category.limit || 0, usageRatio: 0 };
        const usagePercent = Math.min(100, Math.round((usage.usageRatio || 0) * 100));
        return `
          <li class="budget-category-row" data-category-id="${category.id}">
            <div>
              <strong>${category.name}</strong><br />
              <small>${category.type === 'income' ? 'Příjem' : 'Výdaj'} · ${formatCurrency(category.limit || 0)} · použití ${usagePercent}%</small>
            </div>
            <div class="inventory-actions budget-list-actions">
              <span class="budget-usage-pill">${formatCurrency(usage.totalUsed || 0)}</span>
              <button class="secondary budget-edit-btn" type="button" data-category-id="${category.id}">Upravit</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li><div class="budget-empty">Žádné kategorie pro rozpočet.</div></li>';

  const monthTransactions = budgetLogic.getTransactionsForMonth
    ? budgetLogic.getTransactionsForMonth(currentMonth, budgetState.transactions)
    : [];

  budgetTransactionList.innerHTML = monthTransactions.length
    ? monthTransactions.map((transaction) => {
        const category = budgetState.categories.find((item) => String(item.id) === String(transaction.categoryId)) || { name: transaction.categoryName || 'Neznámá kategorie' };
        return `
          <li class="budget-transaction-row" data-transaction-id="${transaction.id}">
            <div>
              <strong>${category.name}</strong><br />
              <small>${transaction.date} · ${transaction.description || 'Bez popisu'}</small>
            </div>
            <div class="inventory-actions budget-list-actions">
              <span class="${transaction.type === 'income' ? 'positive' : 'negative'}">${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount || 0)}</span>
              <button class="secondary budget-delete-transaction-btn" type="button" data-transaction-id="${transaction.id}">Smazat</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li><div class="budget-empty">Žádné transakce pro tento měsíc.</div></li>';

  const alerts = budgetLogic.buildBudgetAlerts
    ? budgetLogic.buildBudgetAlerts(summary, budgetState.categories, budgetState.transactions)
    : [];

  budgetAlertList.innerHTML = alerts.length
    ? alerts.map((alert) => `
        <li class="alert-item ${alert.level || 'warning'}">
          <div>
            <strong>${alert.categoryName || 'Upozornění'}</strong><br />
            <small>${alert.message}</small>
          </div>
          <span class="alert-tag ${alert.level || 'warning'}">${alert.level === 'critical' ? 'Kritické' : 'Varování'}</span>
        </li>
      `).join('')
    : '<li class="budget-empty">Bez varování. Rozpočet je v pořádku.</li>';

  if (budgetChart) {
    const expenseCategories = monthCategories.filter((category) => category.type === 'expense');
    if (!expenseCategories.length) {
      budgetChart.innerHTML = '<div class="budget-empty">Žádné výdajové kategorie pro tento měsíc.</div>';
    } else {
      budgetChart.innerHTML = expenseCategories.map((category) => {
        const usage = summary.categoryBreakdown.find((item) => item.id === category.id) || { totalUsed: 0, useRatio: 0 };
        const used = Number(usage.totalUsed || 0);
        const limit = Number(category.limit || 0);
        const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

        return `
          <div class="budget-chart-row">
            <div class="budget-chart-labels">
              <span>${category.name}</span>
              <strong>${formatCurrency(used)} / ${formatCurrency(limit)}</strong>
            </div>
            <div class="budget-progress"><span style="width: ${percentage}%"></span></div>
          </div>
        `;
      }).join('');
    }
  }

  if (budgetTrendChart) {
    const trendMonths = Array.from(new Set([
      budgetState.selectedMonth,
      ...budgetState.categories.map((category) => category.monthKey),
      ...budgetState.transactions.map((transaction) => transaction.monthKey)
    ].filter(Boolean))).sort();
    const trend = budgetLogic.buildBudgetTrend ? budgetLogic.buildBudgetTrend(trendMonths.slice(-6), budgetState.categories, budgetState.transactions) : [];

    if (!trend.length) {
      budgetTrendChart.innerHTML = '<div class="budget-empty">Žádné údaje pro vývoj rozpočtu.</div>';
    } else {
      const maxSpent = Math.max(...trend.map((item) => Number(item.spent || 0)), 1);
      budgetTrendChart.innerHTML = trend.map((item) => {
        const height = Math.max(16, (Number(item.spent || 0) / maxSpent) * 100);
        const barClass = Number(item.balance || 0) >= 0 ? 'positive' : 'negative';
        return `
          <div class="budget-trend-column">
            <div class="budget-trend-bar-wrap">
              <div class="budget-trend-bar ${barClass}" style="height: ${height}%"></div>
            </div>
            <span>${item.label}</span>
            <small>${formatCurrency(item.balance || 0)}</small>
          </div>
        `;
      }).join('');
    }
  }

  persistBudgetState();
}

function renderWeekPlan() {
  if (!weekPlanEl) {
    return;
  }

  if (!foodCatalog.length) {
    weekPlanEl.innerHTML = '<p class="empty-state">Katalog jídel zatím neobsahuje žádné položky.</p>';
    return;
  }

  weekPlanEl.innerHTML = weekPlanData
    .map((week) => {
      const slotGroupsMarkup = SLOT_GROUPS.map((group) => {
        const groupSlots = week.slots?.[group.key] || [ `${group.key}_1` ];
        const visibleSlots = groupSlots.filter((slotKey) => String(week.items?.[slotKey] || '').trim() !== '');

        return `
          <div class="slot-group">
            <div class="slot-group-header">
              <h4>${group.label}</h4>
              <div class="slot-actions">
                <button class="ghost-btn add-slot-btn" type="button" data-week-start="${week.startDate}" data-slot-group="${group.key}">Přidat další</button>
              </div>
            </div>
            ${visibleSlots
              .map((slotKey) => {
                const allowedFoods = getFoodsForSlot(slotKey);
                const currentValue = week.items?.[slotKey] || '';
                const selectedFoodId = Number(week.foodIds?.[slotKey]);
                const selectedFood = (Number.isFinite(selectedFoodId) && selectedFoodId > 0
                  ? allowedFoods.find((food) => Number(food.id) === selectedFoodId)
                  : null)
                  || allowedFoods.find((food) => food.name === currentValue)
                  || foodCatalog.find((food) => food.name === currentValue)
                  || null;
                const selectedMeta = selectedFood ? getFoodMeta(selectedFood) : null;

                const itemLabel = `${selectedFood.name} - ${selectedMeta.category || selectedMeta.supercategory || 'Kategorie'}`;
                const itemLabelWithSuper = `${itemLabel}${group.key === 'main' && selectedMeta.supercategory ? `, ${selectedMeta.supercategory}` : ''}`;

                return `
                  <div class="slot-row slot-row-filled" data-week-start="${week.startDate}" data-slot-key="${slotKey}" tabindex="0" role="button">
                    <span class="slot-row-text">
                      ${group.key === 'main' && selectedMeta.supercategory && selectedMeta.supercategory !== selectedMeta.category ? itemLabelWithSuper : itemLabel}
                    </span>
                    <button class="icon-row-btn" type="button" data-week-start="${week.startDate}" data-slot-key="${slotKey}" aria-label="Odebrat jídlo">×</button>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      }).join('');

      return `
        <article class="day-card week-card" data-week-start="${week.startDate}">
          <h3>Týden od ${formatDate(new Date(`${week.startDate}T00:00:00`))}</h3>
          <p class="week-range">${formatWeekRange(week.startDate)}</p>
          ${slotGroupsMarkup}
        </article>
      `;
    })
    .join('');

  weekPlanEl.querySelectorAll('.slot-row').forEach((row) => {
    row.addEventListener('click', () => {
      const { weekStart, slotKey } = row.dataset;
      const weekIndex = weekPlanData.findIndex((item) => item.startDate === weekStart);

      if (weekIndex < 0 || !slotKey) {
        return;
      }

      openFoodPickerModal(weekStart, slotKey);
    });

    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        row.click();
      }
    });
  });

  weekPlanEl.querySelectorAll('.icon-row-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const { weekStart, slotKey } = button.dataset;
      const weekIndex = weekPlanData.findIndex((item) => item.startDate === weekStart);

      if (weekIndex < 0 || !slotKey) {
        return;
      }

      const week = weekPlanData[weekIndex];
      const slotDefinition = getSlotDefinition(slotKey);

      if (!slotDefinition) {
        return;
      }

      const removed = removeSlotFromWeek(week, slotDefinition.groupKey, slotKey);
      if (removed) {
        saveWeekPlan(week);
      }
      renderWeekPlan();
    });
  });

  weekPlanEl.querySelectorAll('.add-slot-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const { weekStart, slotGroup } = button.dataset;
      const weekIndex = weekPlanData.findIndex((item) => item.startDate === weekStart);

      if (weekIndex < 0 || !slotGroup) {
        return;
      }

      const week = weekPlanData[weekIndex];
      const currentSlots = Array.isArray(week.slots?.[slotGroup]) ? week.slots[slotGroup] : [`${slotGroup}_1`];
      const nextIndex = currentSlots.reduce((max, slotKey) => {
        const match = /_(\d+)$/.exec(slotKey || '');
        const slotNumber = match ? Number(match[1]) : 0;
        return Math.max(max, slotNumber);
      }, 0) + 1;

      const newSlotKey = `${slotGroup}_${nextIndex}`;
      week.slots[slotGroup] = [...currentSlots, newSlotKey];
      week.items[newSlotKey] = '';
      renderWeekPlan();
      openFoodPickerModal(weekStart, newSlotKey);
    });
  });
}

function resolveFoodPickerFilterState(foods, state = {}) {
  const selectedSupercategory = String(state.supercategory || '').trim();
  const selectedCategory = String(state.category || '').trim();
  const selectedSubcategory = String(state.subcategory || '').trim();

  const supercategories = [...new Set((foods || []).map((food) => food.supercategory).filter(Boolean))].sort();
  const narrowedBySuper = selectedSupercategory
    ? (foods || []).filter((food) => matchesFilterValue(food.supercategory, selectedSupercategory))
    : (foods || []);

  const categories = [...new Set(narrowedBySuper.map((food) => food.category).filter(Boolean))].sort();
  const normalizedCategory = selectedCategory && categories.includes(selectedCategory) ? selectedCategory : '';

  const narrowedByCategory = normalizedCategory
    ? narrowedBySuper.filter((food) => matchesFilterValue(food.category, normalizedCategory))
    : narrowedBySuper;

  const subcategories = [...new Set(narrowedByCategory.map((food) => food.subcategory).filter(Boolean))].sort();
  const normalizedSubcategory = (selectedCategory && !normalizedCategory)
    ? ''
    : (selectedSubcategory && subcategories.includes(selectedSubcategory) ? selectedSubcategory : '');

  return {
    supercategories,
    categories,
    subcategories,
    supercategory: selectedSupercategory || '',
    category: normalizedCategory,
    subcategory: normalizedSubcategory
  };
}

function getFoodPickerOptions(slotKey, selectedValues = {}) {
  const targetFoods = getFoodsForSlot(slotKey);
  return resolveFoodPickerFilterState(targetFoods, selectedValues);
}

function renderFoodPickerModal() {
  if (!foodPickerModal || !foodPickerSupercategory || !foodPickerCategory || !foodPickerSubcategory || !foodPickerList) {
    return;
  }

  const slotKey = foodPickerState.slotKey;
  const currentWeek = weekPlanData.find((week) => week.startDate === foodPickerState.weekStart);
  const slotDefinition = getSlotDefinition(slotKey);
  const selectedValue = currentWeek?.items?.[slotKey] || '';
  const targetFoods = getFoodsForSlot(slotKey);
  const slotSupercategory = slotDefinition?.supercategory || 'Všechny';

  const selectedSupercategory = foodPickerSupercategory.value || '';
  const selectedCategory = foodPickerCategory.value || '';
  const selectedSubcategory = foodPickerSubcategory.value || '';
  const options = getFoodPickerOptions(slotKey, {
    supercategory: selectedSupercategory,
    category: selectedCategory,
    subcategory: selectedSubcategory
  });

  if (foodPickerTitle) {
    foodPickerTitle.textContent = `${slotDefinition?.label || 'Jídlo'} · ${slotSupercategory}`;
  }

  foodPickerSupercategory.innerHTML = [
    '<option value="">Všechny nadkategorie</option>',
    ...options.supercategories.map((name) => `<option value="${name}">${name}</option>`)
  ].join('');

  foodPickerCategory.innerHTML = [
    '<option value="">Všechny kategorie</option>',
    ...options.categories.map((name) => `<option value="${name}">${name}</option>`)
  ].join('');

  foodPickerSubcategory.innerHTML = [
    '<option value="">Všechny podkategorie</option>',
    ...options.subcategories.map((name) => `<option value="${name}">${name}</option>`)
  ].join('');

  const resolvedSupercategory = options.supercategory || (slotSupercategory && options.supercategories.includes(slotSupercategory) ? slotSupercategory : '');
  const resolvedCategory = options.category || '';
  const resolvedSubcategory = options.subcategory || '';

  foodPickerSupercategory.value = resolvedSupercategory;
  foodPickerCategory.value = resolvedCategory;
  foodPickerSubcategory.value = resolvedSubcategory;

  const filteredFoods = filterFoodSelectionOptions(targetFoods, {
    supercategory: foodPickerSupercategory.value || '',
    category: foodPickerCategory.value || '',
    subcategory: foodPickerSubcategory.value || '',
    query: foodPickerSearch?.value || ''
  });

  if (!filteredFoods.length) {
    foodPickerList.innerHTML = '<div class="selected-food-summary"><strong>Žádná jídla</strong><small>Pro aktuální filtr neexistuje žádná vhodná varianta.</small></div>';
    return;
  }

  foodPickerList.innerHTML = filteredFoods
    .map((food) => {
      const foodMeta = getFoodMeta(food);
      const isSelected = selectedValue && selectedValue === food.name;

      return `
        <button class="food-picker-item" type="button" data-food-name="${food.name}" data-food-id="${food.id ?? ''}">
          <div>
            <strong>${food.name}</strong>
            <small>${foodMeta.label}</small>
          </div>
          ${isSelected ? '<span class="ghost-btn">Vybráno</span>' : ''}
        </button>
      `;
    })
    .join('');
}

function openFoodPickerModal(weekStart, slotKey) {
  foodPickerState.weekStart = weekStart;
  foodPickerState.slotKey = slotKey;
  if (foodPickerModal) {
    foodPickerModal.classList.remove('hidden');
    foodPickerModal.setAttribute('aria-hidden', 'false');
  }
  renderFoodPickerModal();
}

function closeFoodPickerModal() {
  if (foodPickerModal) {
    foodPickerModal.classList.add('hidden');
    foodPickerModal.setAttribute('aria-hidden', 'true');
  }
  foodPickerState.weekStart = null;
  foodPickerState.slotKey = null;
}

function setActiveApp(appName = 'foodplanner') {
  const nextApp = appName === 'budget' ? 'budget' : 'foodplanner';

  if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.activeApp = nextApp;
  }

  appSwitchButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.appSwitch === nextApp);
  });

  moduleNavs.forEach((nav) => {
    nav.classList.toggle('hidden', nav.dataset.moduleNav !== nextApp);
  });

  const nextView = nextApp === 'budget' ? 'budget' : 'overview';
  setActiveView(nextView);
}

function setActiveView(viewName) {
  navButtons.forEach((button) => {
    const activeApp = typeof document !== 'undefined' && document.body ? document.body.dataset.activeApp : 'foodplanner';
    const isActive = button.dataset.view === viewName && button.dataset.app === activeApp;
    button.classList.toggle('active', isActive);
  });

  document.querySelectorAll('[data-view-panel]').forEach((panel) => {
    const shouldShow = panel.dataset.viewPanel === viewName;
    panel.classList.toggle('hidden', !shouldShow);
  });

  const sidePanel = document.querySelector('.side-panel');
  if (sidePanel) {
    sidePanel.classList.toggle('hidden', viewName === 'freezer' || viewName === 'stock' || viewName === 'budget');
  }

  if (viewName === 'overview') {
    fetchWeeklyPlansForDates((weekPlanData || []).map((week) => week.startDate), weekPlanData);
  }

  if (viewName === 'foods') {
    renderFoodCatalog();
  }

  if (viewName === 'freezer') {
    renderFreezerFoodSelection();
  }

  if (viewName === 'stock') {
    renderStockList();
  }

  if (viewName === 'budget') {
    renderBudgetView();
  }
}

if (typeof document !== 'undefined' && document.body) {
  document.body.dataset.activeApp = 'foodplanner';
}

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextApp = button.dataset.app || 'foodplanner';
    setActiveApp(nextApp);
  });
});

appSwitchButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextApp = button.dataset.appSwitch || 'foodplanner';
    setActiveApp(nextApp);
  });
});

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  loadBudgetFromServer();
}

foodForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('foodName').value.trim();
  const supercategory = foodSupercategorySelect?.value.trim() || 'Hlavní jídlo';
  const selectedSupercategoryOption = foodSupercategorySelect?.selectedOptions?.[0];
  const foodType = selectedSupercategoryOption?.dataset?.foodTypeName || supercategory;
  const category = document.getElementById('foodCategory').value.trim();
  const subcategory = document.getElementById('foodSubcategory').value.trim();

  if (!name) {
    return;
  }

  const payload = buildFoodSubmissionPayload({
    name,
    supercategory,
    category,
    subcategory,
    foodType
  });

  try {
    const response = await fetch('/api/foods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || 'Nepodařilo se uložit jídlo do databáze.');
    }

    const savedFood = result.item || {
      id: result.id || Date.now(),
      name: payload.name,
      supercategory: payload.supercategory,
      category: payload.category,
      subcategory: payload.subcategory || null,
      foodType: payload.food_type_name || payload.supercategory,
      fullLabel: [payload.supercategory, payload.category, payload.subcategory].filter(Boolean).join(' · ') || 'vlastní',
      classification: [payload.supercategory, payload.category, payload.subcategory].filter(Boolean).join(' / ') || 'vlastní'
    };

    foodCatalog.unshift({
      id: savedFood.id,
      name: savedFood.name,
      supercategory: savedFood.supercategory || payload.supercategory,
      foodType: savedFood.foodType || savedFood.food_type_name || payload.food_type_name || payload.supercategory,
      category: savedFood.category || payload.category,
      subcategory: savedFood.subcategory || payload.subcategory || null,
      fullLabel: savedFood.fullLabel || [savedFood.supercategory || payload.supercategory, savedFood.category || payload.category, savedFood.subcategory || payload.subcategory].filter(Boolean).join(' · ') || 'vlastní',
      classification: savedFood.classification || [savedFood.supercategory || payload.supercategory, savedFood.category || payload.category, savedFood.subcategory || payload.subcategory].filter(Boolean).join(' / ') || 'vlastní'
    });

    renderFoodCatalog();
    renderWeekPlan();
    foodForm.reset();
    document.getElementById('foodName').focus();

    const fallbackValue = availableSupercategories[0]?.name || 'Hlavní jídlo';
    if (foodSupercategorySelect) {
      foodSupercategorySelect.value = fallbackValue;
    }
  } catch (error) {
    console.error('Chyba při ukládání nového jídla:', error);
    window.alert(error.message || 'Nepodařilo se uložit jídlo do databáze.');
  }
});

if (foodSearch) {
  foodSearch.addEventListener('input', renderFoodCatalog);
}

if (budgetMonthPicker) {
  budgetMonthPicker.addEventListener('change', async (event) => {
    budgetState.selectedMonth = event.target.value || budgetState.selectedMonth;
    await loadBudgetFromServer(budgetState.selectedMonth);
    renderBudgetView();
  });
}

if (budgetPrevMonthBtn) {
  budgetPrevMonthBtn.addEventListener('click', async () => {
    const currentMonth = budgetState.selectedMonth || (budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : '2026-09');
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1, 1);
    next.setMonth(next.getMonth() - 1);
    budgetState.selectedMonth = budgetLogic.getMonthKey ? budgetLogic.getMonthKey(next) : `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    await loadBudgetFromServer(budgetState.selectedMonth);
    renderBudgetView();
  });
}

if (budgetNextMonthBtn) {
  budgetNextMonthBtn.addEventListener('click', async () => {
    const currentMonth = budgetState.selectedMonth || (budgetLogic.getMonthKey ? budgetLogic.getMonthKey(new Date()) : '2026-09');
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1, 1);
    next.setMonth(next.getMonth() + 1);
    budgetState.selectedMonth = budgetLogic.getMonthKey ? budgetLogic.getMonthKey(next) : `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    await loadBudgetFromServer(budgetState.selectedMonth);
    renderBudgetView();
  });
}

if (budgetCategoryForm) {
  budgetCategoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const categoryId = budgetCategoryIdInput?.value || '';
    const name = document.getElementById('budgetCategoryName')?.value?.trim();
    const type = document.getElementById('budgetCategoryType')?.value || 'expense';
    const limit = Number(document.getElementById('budgetCategoryLimit')?.value || 0);
    const notes = document.getElementById('budgetCategoryNotes')?.value?.trim() || '';

    if (!name) {
      return;
    }

    const categoryPayload = {
      name,
      type,
      planned_amount: limit,
      notes,
      color: '#2d7a5f'
    };

    try {
      const response = await saveBudgetCategoryToServer(categoryPayload, categoryId || undefined);
      if (response) {
        await loadBudgetFromServer(budgetState.selectedMonth);
      }
    } catch (error) {
      console.error('Chyba při ukládání kategorie rozpočtu:', error);
      window.alert(error.message || 'Nepodařilo se uložit kategorii.');
      return;
    }

    budgetCategoryForm.reset();
    budgetCategoryIdInput.value = '';
    budgetCategorySubmitBtn.textContent = 'Přidat kategorii';
    renderBudgetView();
  });
}

if (budgetTransactionForm) {
  budgetTransactionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const transactionId = budgetTransactionIdInput?.value || '';
    const categoryId = budgetTransactionCategory?.value;
    const amount = Number(document.getElementById('budgetTransactionAmount')?.value || 0);
    const type = document.getElementById('budgetTransactionType')?.value || 'expense';
    const date = document.getElementById('budgetTransactionDate')?.value || new Date().toISOString().slice(0, 10);
    const description = document.getElementById('budgetTransactionDescription')?.value?.trim() || 'Bez popisu';
    const source = document.getElementById('budgetTransactionSource')?.value?.trim() || '';

    if (!categoryId || amount <= 0) {
      return;
    }

    const category = budgetState.categories.find((item) => String(item.id) === String(categoryId));
    const payload = {
      category_id: categoryId,
      month_key: budgetState.selectedMonth,
      transaction_type: type,
      amount,
      description,
      source,
      transaction_date: date
    };

    try {
      const response = await saveBudgetTransactionToServer(payload, transactionId || undefined);
      if (response) {
        await loadBudgetFromServer(budgetState.selectedMonth);
      }
    } catch (error) {
      console.error('Chyba při ukládání transakce rozpočtu:', error);
      window.alert(error.message || 'Nepodařilo se uložit transakci.');
      return;
    }

    budgetTransactionForm.reset();
    budgetTransactionIdInput.value = '';
    budgetTransactionSubmitBtn.textContent = 'Zapsat transakci';
    renderBudgetView();
  });
}

if (budgetCategoryList) {
  budgetCategoryList.addEventListener('click', (event) => {
    const button = event.target.closest('.budget-edit-btn');
    if (!button) {
      return;
    }

    const categoryId = button.dataset.categoryId;
    const category = budgetState.categories.find((item) => String(item.id) === String(categoryId));
    if (!category) {
      return;
    }

    if (budgetCategoryIdInput) {
      budgetCategoryIdInput.value = category.id;
    }
    if (document.getElementById('budgetCategoryName')) {
      document.getElementById('budgetCategoryName').value = category.name;
    }
    if (document.getElementById('budgetCategoryType')) {
      document.getElementById('budgetCategoryType').value = category.type;
    }
    if (document.getElementById('budgetCategoryLimit')) {
      document.getElementById('budgetCategoryLimit').value = category.limit;
    }
    if (document.getElementById('budgetCategoryNotes')) {
      document.getElementById('budgetCategoryNotes').value = category.notes || '';
    }
    if (budgetCategorySubmitBtn) {
      budgetCategorySubmitBtn.textContent = 'Uložit úpravu';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if (budgetTransactionList) {
  budgetTransactionList.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('.budget-delete-transaction-btn');
    if (deleteButton) {
      const transactionId = deleteButton.dataset.transactionId;
      try {
        await deleteBudgetTransactionFromServer(transactionId);
        await loadBudgetFromServer(budgetState.selectedMonth);
      } catch (error) {
        console.error('Chyba při mazání transakce:', error);
        window.alert(error.message || 'Nepodařilo se odstranit transakci.');
      }
      return;
    }

    const row = event.target.closest('.budget-transaction-row');
    if (!row) {
      return;
    }

    const transactionId = row.dataset.transactionId;
    const transaction = budgetState.transactions.find((item) => String(item.id) === String(transactionId));
    if (!transaction) {
      return;
    }

    if (budgetTransactionIdInput) {
      budgetTransactionIdInput.value = transaction.id;
    }
    if (document.getElementById('budgetTransactionType')) {
      document.getElementById('budgetTransactionType').value = transaction.type;
    }
    if (document.getElementById('budgetTransactionAmount')) {
      document.getElementById('budgetTransactionAmount').value = transaction.amount;
    }
    if (document.getElementById('budgetTransactionDescription')) {
      document.getElementById('budgetTransactionDescription').value = transaction.description || '';
    }
    if (document.getElementById('budgetTransactionSource')) {
      document.getElementById('budgetTransactionSource').value = transaction.source || '';
    }
    if (document.getElementById('budgetTransactionDate')) {
      document.getElementById('budgetTransactionDate').value = transaction.date || new Date().toISOString().slice(0, 10);
    }
    if (budgetTransactionCategory) {
      budgetTransactionCategory.value = transaction.categoryId || budgetTransactionCategory.value;
    }
    if (budgetTransactionSubmitBtn) {
      budgetTransactionSubmitBtn.textContent = 'Uložit transakci';
    }
  });
}

if (foodPickerSupercategory) {
  foodPickerSupercategory.addEventListener('change', renderFoodPickerModal);
}

if (foodPickerCategory) {
  foodPickerCategory.addEventListener('change', renderFoodPickerModal);
}

if (foodPickerSubcategory) {
  foodPickerSubcategory.addEventListener('change', renderFoodPickerModal);
}

if (foodPickerSearch) {
  foodPickerSearch.addEventListener('input', renderFoodPickerModal);
}

if (foodPickerModal) {
  foodPickerModal.addEventListener('click', (event) => {
    const closeTrigger = event.target.closest('[data-close-picker]');
    if (closeTrigger) {
      closeFoodPickerModal();
      return;
    }

    const selectedFoodButton = event.target.closest('[data-food-name]');
    if (!selectedFoodButton) {
      return;
    }

    const foodName = selectedFoodButton.dataset.foodName;
    const foodId = Number(selectedFoodButton.dataset.foodId);
    const weekIndex = weekPlanData.findIndex((item) => item.startDate === foodPickerState.weekStart);

    if (weekIndex >= 0 && foodPickerState.slotKey) {
      const week = weekPlanData[weekIndex];
      week.items[foodPickerState.slotKey] = foodName || '';
      week.foodIds[foodPickerState.slotKey] = Number.isFinite(foodId) && foodId > 0 ? foodId : null;
      saveWeekPlan(week);
      renderWeekPlan();
    }

    closeFoodPickerModal();
  });
}

if (clearFoodSelectionBtn) {
  clearFoodSelectionBtn.addEventListener('click', () => {
    const weekIndex = weekPlanData.findIndex((item) => item.startDate === foodPickerState.weekStart);

    if (weekIndex >= 0 && foodPickerState.slotKey) {
      const week = weekPlanData[weekIndex];
      week.items[foodPickerState.slotKey] = '';
      delete week.foodIds?.[foodPickerState.slotKey];
      saveWeekPlan(week);
      renderWeekPlan();
    }

    closeFoodPickerModal();
  });
}

document.getElementById('prevWeekBtn')?.addEventListener('click', () => moveVisibleWeeks(-1));
document.getElementById('nextWeekBtn')?.addEventListener('click', () => moveVisibleWeeks(1));
document.getElementById('todayWeekBtn')?.addEventListener('click', () => jumpToToday());

function persistInventoryState() {
  saveInventoryList('food_planner_freezer_items', freezerItems);
  saveInventoryList('food_planner_stock_items', stockItems);
  renderFreezerList();
  renderStockList();
}

function populateInventoryFoodSelects() {
  const freezerFoodSelect = freezerForm && typeof freezerForm.querySelector === 'function'
    ? freezerForm.querySelector('[name="freezerFoodId"]')
    : null;

  if (!freezerFoodSelect) {
    return;
  }

  const options = foodCatalog.length
    ? foodCatalog.map((food) => `<option value="${food.id}">${food.name}</option>`).join('')
    : '<option value="">Žádné jídlo v katalogu</option>';

  freezerFoodSelect.innerHTML = `<option value="">Vyberte jídlo z katalogu</option>${options}`;
}

if (freezerForm && typeof freezerForm.addEventListener === 'function') {
  freezerForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const nameInput = freezerForm.querySelector('[name="freezerName"]');
    const foodSelect = freezerForm.querySelector('[name="freezerFoodId"]');
    const name = nameInput?.value?.trim();
    const selectedFoodId = Number(foodSelect?.value ?? 0);
    const quantity = Number(freezerForm.querySelector('[name="freezerQuantity"]')?.value ?? 0);
    const unit = freezerForm.querySelector('[name="freezerUnit"]')?.value?.trim() || 'porce';

    const resolvedName = name || foodCatalog.find((food) => Number(food.id) === selectedFoodId)?.name || '';

    if (!resolvedName || !Number.isFinite(selectedFoodId) || selectedFoodId <= 0) {
      return;
    }

    const nextItems = addInventoryItem(freezerItems, {
      name: resolvedName,
      food_id: selectedFoodId,
      quantity,
      unit,
      type: 'freezer',
      addedAt: new Date().toISOString().slice(0, 10)
    });

    freezerItems.length = 0;
    freezerItems.push(...nextItems);
    persistInventoryState();
    freezerForm.reset();
    renderFreezerFoodSelection();
  });
}

if (stockForm && typeof stockForm.addEventListener === 'function') {
  stockForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const nameInput = stockForm.querySelector('[name="stockName"]');
    const name = nameInput?.value?.trim();
    const quantity = Number(stockForm.querySelector('[name="stockQuantity"]')?.value ?? 0);
    const unit = stockForm.querySelector('[name="stockUnit"]')?.value?.trim() || 'kg';
    const expiresAt = stockForm.querySelector('[name="stockExpiresAt"]')?.value || '';
    const category = stockForm.querySelector('[name="stockCategory"]')?.value?.trim() || '';

    if (!name) {
      return;
    }

    const nextItems = addInventoryItem(stockItems, {
      name,
      quantity,
      unit,
      expiresAt,
      category,
      type: 'stock'
    });

    stockItems.length = 0;
    stockItems.push(...nextItems);
    persistInventoryState();
    stockForm.reset();
  });
}

if (freezerFoodList) {
  freezerFoodList.addEventListener('click', (event) => {
    const button = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-food-id]')
      : null;

    if (!button) {
      return;
    }

    const selectedFoodId = Number(button.dataset.foodId ?? 0);
    const selectedFoodName = button.dataset.foodName || '';

    if (!selectedFoodId || !selectedFoodName) {
      return;
    }

    const hiddenField = freezerForm?.querySelector('[name="freezerFoodId"]');
    if (hiddenField) {
      hiddenField.value = String(selectedFoodId);
    }

    const nameInput = freezerForm?.querySelector('[name="freezerName"]');
    if (nameInput) {
      nameInput.value = selectedFoodName;
    }
  });
}

if (freezerSupercategory) {
  freezerSupercategory.addEventListener('change', renderFreezerFoodSelection);
}

if (freezerCategory) {
  freezerCategory.addEventListener('change', renderFreezerFoodSelection);
}

if (freezerSubcategory) {
  freezerSubcategory.addEventListener('change', renderFreezerFoodSelection);
}

if (freezerSearch) {
  freezerSearch.addEventListener('input', renderFreezerFoodSelection);
}

if (freezerForm && typeof freezerForm.addEventListener === 'function') {
  freezerForm.addEventListener('reset', () => {
    if (freezerForm) {
      const hiddenField = freezerForm.querySelector('[name="freezerFoodId"]');
      if (hiddenField) {
        hiddenField.value = '';
      }
    }

    renderFreezerFoodSelection();
  });
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('click', (event) => {
    const target = event?.target;
    const button = target && typeof target.closest === 'function' ? target.closest('[data-inventory-action]') : null;

    if (!button) {
      return;
    }

    const inventoryType = String(button.dataset.inventoryType || '');
    const itemId = String(button.dataset.itemId || '');
    const action = button.dataset.inventoryAction;

    if (!inventoryType || !itemId || !action) {
      return;
    }

    const sourceList = inventoryType === 'freezer' ? freezerItems : stockItems;
    const item = findInventoryItemByReference(sourceList, itemId, button);

    if (!item) {
      return;
    }

    if (action === 'increment') {
      const next = updateInventoryQuantity(sourceList, item.id, getInventoryStep(inventoryType), inventoryType);
      sourceList.splice(0, sourceList.length, ...next);
      persistInventoryState();
      return;
    }

    if (action === 'decrement') {
      const next = updateInventoryQuantity(sourceList, item.id, -getInventoryStep(inventoryType), inventoryType);
      sourceList.splice(0, sourceList.length, ...next);
      persistInventoryState();
      return;
    }

    if (action === 'delete') {
      const index = sourceList.findIndex((stockItem) => String(stockItem.id) === String(item.id));
      if (index >= 0) {
        sourceList.splice(index, 1);
        persistInventoryState();
      }
    }
  });
}

renderFreezerList();
renderStockList();
renderBudgetView();
populateInventoryFoodSelects();
renderWeekHeader();
setActiveView('overview');
loadSupercategoryOptions();
loadFoodCatalog();
loadSavedWeeklyPlans();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SLOT_GROUPS,
    createDefaultSlotGroups,
    getSlotDefinition,
    ensureWeekSlotState,
    getWeekSlotEntries,
    removeSlotFromWeek,
    serializeWeekForServer,
    getStartOfWeek,
    buildVisibleWeekWindow,
    shiftVisibleWeeks,
    hydrateSavedWeekData,
    moveVisibleWeeks,
    filterFoodSelectionOptions,
    resolveFoodPickerFilterState,
    addInventoryItem,
    updateInventoryQuantity,
    getInventoryStep,
    getInventorySummary,
    buildFoodSubmissionPayload,
    weekPlanData
  };
}
