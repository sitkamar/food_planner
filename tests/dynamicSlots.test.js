const test = require('node:test');
const assert = require('node:assert/strict');

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const elements = {};

function createElement() {
  return {
    addEventListener() {},
    reset() {},
    focus() {},
    value: '',
    innerHTML: '',
    dataset: {},
    selectedOptions: [{ dataset: { foodTypeName: 'Hlavní jídlo' } }]
  };
}

global.window = {};
global.document = {
  getElementById(id) {
    if (!elements[id]) {
      elements[id] = createElement();
    }

    return elements[id];
  },
  querySelectorAll() {
    return [];
  },
  querySelector() {
    return null;
  }
};

global.fetch = async (url) => {
  if (url === '/api/supercategories') {
    return {
      ok: true,
      json: async () => ({
        items: [{ name: 'Hlavní jídlo', food_type_name: 'Hlavní jídlo' }]
      })
    };
  }

  if (url === '/api/foods') {
    return {
      ok: true,
      json: async () => ({ items: [] })
    };
  }

  if (url === '/api/weekly-plans') {
    return {
      ok: true,
      json: async () => ({ items: [] })
    };
  }

  return {
    ok: false,
    json: async () => ({ message: 'Neznámé API' })
  };
};

const {
  createDefaultSlotGroups,
  getSlotDefinition,
  ensureWeekSlotState,
  getWeekSlotEntries,
  serializeWeekForServer,
  removeSlotFromWeek,
  getStartOfWeek,
  buildVisibleWeekWindow,
  shiftVisibleWeeks,
  hydrateSavedWeekData,
  moveVisibleWeeks,
  filterFoodSelectionOptions,
  resolveFoodPickerFilterState,
  addInventoryItem,
  updateInventoryQuantity,
  getInventorySummary,
  weekPlanData
} = require('../app.js');

test('výchozí plán má jeden slot v každé základní kategorii a je prázdný', () => {
  const initialWeek = weekPlanData[0];

  assert.deepEqual(initialWeek.slots, {
    breakfast: ['breakfast_1'],
    main: ['main_1'],
    snack: ['snack_1'],
    non_cooking: ['non_cooking_1']
  });

  assert.equal(initialWeek.items.breakfast_1, '');
  assert.equal(initialWeek.items.main_1, '');
  assert.equal(initialWeek.items.snack_1, '');
  assert.equal(initialWeek.items.non_cooking_1, '');
});

test('vytvoření výchozích skupin vrátí pouze jeden slot pro každý typ', () => {
  assert.deepEqual(createDefaultSlotGroups(), {
    breakfast: ['breakfast_1'],
    main: ['main_1'],
    snack: ['snack_1'],
    non_cooking: ['non_cooking_1']
  });
});

test('přidání dalšího slotu přidá novou položku v dané skupině', () => {
  const week = {
    startDate: '2026-09-21',
    slots: {
      breakfast: ['breakfast_1'],
      main: ['main_1'],
      snack: ['snack_1'],
      non_cooking: ['non_cooking_1']
    },
    items: {
      breakfast_1: '',
      main_1: '',
      snack_1: '',
      non_cooking_1: ''
    }
  };

  ensureWeekSlotState(week);
  week.slots.breakfast.push('breakfast_2');
  week.items.breakfast_2 = '';

  assert.deepEqual(week.slots.breakfast, ['breakfast_1', 'breakfast_2']);
  assert.equal(getSlotDefinition('breakfast_2').label, 'Snídaně 2');
});

test('seznam slotů obsahuje všechny aktivní sloty pro každou skupinu', () => {
  const week = {
    startDate: '2026-09-21',
    slots: {
      breakfast: ['breakfast_1', 'breakfast_2'],
      main: ['main_1'],
      snack: ['snack_1', 'snack_2'],
      non_cooking: ['non_cooking_1']
    },
    items: {
      breakfast_1: '',
      breakfast_2: '',
      main_1: '',
      snack_1: '',
      snack_2: '',
      non_cooking_1: ''
    }
  };

  const entries = getWeekSlotEntries(week).map((entry) => entry.slotKey);

  assert.deepEqual(entries, [
    'breakfast_1',
    'breakfast_2',
    'main_1',
    'snack_1',
    'snack_2',
    'non_cooking_1'
  ]);
});

test('serializace týdne ukládá jen vybraná jídla a zachová prázdné sloty', () => {
  const week = {
    startDate: '2026-09-21',
    slots: {
      breakfast: ['breakfast_1', 'breakfast_2'],
      main: ['main_1'],
      snack: ['snack_1'],
      non_cooking: ['non_cooking_1']
    },
    items: {
      breakfast_1: 'Lívance',
      breakfast_2: '',
      main_1: 'Kuřecí rizoto',
      snack_1: 'Jablko',
      non_cooking_1: ''
    }
  };

  assert.deepEqual(serializeWeekForServer(week), [
    { slot_group: 'breakfast', slot_index: 1, food_id: null, food_name: 'Lívance' },
    { slot_group: 'breakfast', slot_index: 2, food_id: null, food_name: '' },
    { slot_group: 'main', slot_index: 1, food_id: null, food_name: 'Kuřecí rizoto' },
    { slot_group: 'snack', slot_index: 1, food_id: null, food_name: 'Jablko' },
    { slot_group: 'non_cooking', slot_index: 1, food_id: null, food_name: '' }
  ]);
});

test('odebrání jídla smaže slot i z dat a ne nechá prázdný řádek', () => {
  const week = {
    startDate: '2026-09-21',
    slots: {
      breakfast: ['breakfast_1', 'breakfast_2'],
      main: ['main_1'],
      snack: ['snack_1'],
      non_cooking: ['non_cooking_1']
    },
    items: {
      breakfast_1: 'Lívance',
      breakfast_2: 'Ovesná kaše',
      main_1: '',
      snack_1: '',
      non_cooking_1: ''
    }
  };

  removeSlotFromWeek(week, 'breakfast', 'breakfast_2');

  assert.deepEqual(week.slots.breakfast, ['breakfast_1']);
  assert.equal(week.items.breakfast_2, undefined);
});

test('vybrané jídlo se ukládá podle food_id a ne podle názvu', () => {
  const week = {
    startDate: '2026-09-21',
    slots: {
      breakfast: ['breakfast_1', 'breakfast_2']
    },
    items: {
      breakfast_1: 'Peach cobbler',
      breakfast_2: 'Peach cobbler'
    },
    foodIds: {
      breakfast_1: 10,
      breakfast_2: 22
    }
  };

  assert.deepEqual(serializeWeekForServer(week), [
    { slot_group: 'breakfast', slot_index: 1, food_id: 10, food_name: 'Peach cobbler' },
    { slot_group: 'breakfast', slot_index: 2, food_id: 22, food_name: 'Peach cobbler' },
    { slot_group: 'main', slot_index: 1, food_id: null, food_name: '' },
    { slot_group: 'snack', slot_index: 1, food_id: null, food_name: '' },
    { slot_group: 'non_cooking', slot_index: 1, food_id: null, food_name: '' }
  ]);
});

test('začátek týdne je vždy pondělí', () => {
  assert.equal(formatLocalDate(getStartOfWeek(new Date('2026-09-19T12:00:00+02:00'))), '2026-09-14');
  assert.equal(formatLocalDate(getStartOfWeek(new Date('2026-09-21T12:00:00+02:00'))), '2026-09-21');
});

test('posun zobrazených týdnů o jeden týden mění všechna data o +7 dní', () => {
  const base = getStartOfWeek(new Date('2026-09-21T12:00:00+02:00'));
  const weeks = buildVisibleWeekWindow(base);

  assert.deepEqual(weeks.map((week) => week.startDate), [
    '2026-09-21',
    '2026-09-28',
    '2026-10-05'
  ]);

  const shifted = shiftVisibleWeeks(weeks, 1);
  assert.deepEqual(shifted.map((week) => week.startDate), [
    '2026-09-28',
    '2026-10-05',
    '2026-10-12'
  ]);
});

test('výběr jídla filtruje podle nadkategorie, kategorie a podkategorie', () => {
  const foods = [
    { name: 'Vetrník', supercategory: 'Snídaně - slané', category: 'vejce', subcategory: 'slané' },
    { name: 'Ovesná kaše', supercategory: 'Snídaně - sladké', category: 'sladké', subcategory: 'oves' },
    { name: 'Salát', supercategory: 'Hlavní jídlo - zeleninové', category: 'zeleninový', subcategory: 'studený' },
    { name: 'Rýže s kuřetem', supercategory: 'Hlavní jídlo - s rýží', category: 's rýží', subcategory: 'rychlé' }
  ];

  const filtered = filterFoodSelectionOptions(foods, {
    supercategory: 'Snídaně',
    category: 'sladké',
    subcategory: 'oves',
    query: 'oves'
  });

  assert.deepEqual(filtered.map((food) => food.name), ['Ovesná kaše']);
});

test('filtr rozlišuje název a třídy jídla i při detailních superkategoriích', () => {
  const foods = [
    { name: 'Ručně rozkrájená tortila', supercategory: 'Hlavní jídlo - tortily', category: 'tortily', subcategory: 'chicken' },
    { name: 'Veganský salát', supercategory: 'Hlavní jídlo - saláty', category: 'zelenina', subcategory: 'čerstvé' },
    { name: 'Banánové ovesné vločky', supercategory: 'Snídaně - sladké', category: 'oves', subcategory: 'banán' }
  ];

  const filtered = filterFoodSelectionOptions(foods, {
    supercategory: 'Snídaně',
    query: 'banan'
  });

  assert.deepEqual(filtered.map((food) => food.name), ['Banánové ovesné vločky']);
});

test('vyšší filtr omezuje nižší filtry a ruší neplatné hodnoty', () => {
  const foods = [
    { name: 'Ovesná kaše', supercategory: 'Snídaně - sladké', category: 'oves', subcategory: 'banán' },
    { name: 'Vetrník', supercategory: 'Snídaně - slané', category: 'vejce', subcategory: 'slané' },
    { name: 'Rýže s kuřetem', supercategory: 'Hlavní jídlo - rýže', category: 's rýží', subcategory: 'rychlé' }
  ];

  const state = resolveFoodPickerFilterState(foods, {
    supercategory: 'Snídaně',
    category: 's rýží',
    subcategory: 'banán'
  });

  assert.deepEqual(state.categories, ['oves', 'vejce']);
  assert.deepEqual(state.subcategories, ['banán', 'slané']);
  assert.equal(state.category, '');
  assert.equal(state.subcategory, '');
});

test('předchozí tlačítko posouvá zobrazené týdny od levého aktuálního týdne', () => {
  weekPlanData.length = 0;
  weekPlanData.push(...buildVisibleWeekWindow('2026-09-21'));

  moveVisibleWeeks(-1);

  assert.deepEqual(weekPlanData.map((week) => week.startDate), [
    '2026-09-14',
    '2026-09-21',
    '2026-09-28'
  ]);
});

test('po posunu do jiného týdne se načtou uložená jídla pro daný týden', () => {
  const weeks = buildVisibleWeekWindow('2026-09-21');
  const savedWeeks = [
    {
      week_start_date: '2026-09-28',
      slots: {
        breakfast: ['breakfast_1'],
        main: ['main_1'],
        snack: ['snack_1'],
        non_cooking: ['non_cooking_1']
      },
      items: {
        breakfast_1: 'Ovesná kaše',
        main_1: 'Kuřecí rizoto',
        snack_1: 'Jablko',
        non_cooking_1: ''
      }
    }
  ];

  const hydrated = hydrateSavedWeekData(savedWeeks, weeks);
  const targetWeek = hydrated.find((week) => week.startDate === '2026-09-28');

  assert.ok(targetWeek);
  assert.equal(targetWeek.items.breakfast_1, 'Ovesná kaše');
  assert.equal(targetWeek.items.main_1, 'Kuřecí rizoto');
  assert.equal(targetWeek.items.snack_1, 'Jablko');
});

test('přidání a úprava množství v mrazáku a zásobách se počítá správně', () => {
  const freezer = [
    { id: 1, name: 'Lasagne', quantity: 2, unit: 'porce', addedAt: '2026-09-10' }
  ];
  const stock = [
    { id: 2, name: 'Mleté maso', quantity: 1, unit: 'kg', expiresAt: '2026-09-25' }
  ];

  const addedFreezer = addInventoryItem(freezer, { name: 'Guláš', quantity: 1, unit: 'porce' });
  const updatedFreezer = updateInventoryQuantity(freezer, 1, 2);
  const updatedStock = updateInventoryQuantity(stock, 2, -0.5);

  assert.equal(addedFreezer.length, 2);
  assert.equal(updatedFreezer[0].quantity, 4);
  assert.equal(updatedStock[0].quantity, 0.5);

  const summary = getInventorySummary({ freezer: updatedFreezer, stock: updatedStock });
  assert.equal(summary.freezerCount, 1);
  assert.equal(summary.stockCount, 1);
  assert.equal(summary.freezerPortions, 4);

  const stockWithoutFoodLink = addInventoryItem([], {
    name: 'Kuřecí prsa',
    quantity: 2,
    unit: 'kg',
    food_id: 17,
    type: 'stock'
  });

  assert.equal(stockWithoutFoodLink[0].food_id, null);
});
