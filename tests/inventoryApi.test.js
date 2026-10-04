const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { app, createInventoryPayload, getInventoryTable, validateInventoryQuantity } = require('../server.js');

test('tabulky inventáře jsou omezené na připravené tabulky', () => {
  assert.equal(getInventoryTable('freezer'), 'freezer_items');
  assert.equal(getInventoryTable('stock'), 'stock_items');
  assert.equal(getInventoryTable('users'), null);
});

test('payload zásob zachová kg i celá balení', () => {
  assert.deepEqual(createInventoryPayload('stock', {
    name: 'Mleté maso',
    quantity: 0.7,
    unit: 'kg',
    category: 'Maso'
  }), {
    name: 'Mleté maso',
    quantity: 0.7,
    unit: 'kg',
    category: 'Maso',
    expires_at: null,
    notes: null
  });

  assert.equal(createInventoryPayload('stock', {
    name: 'Rýže',
    quantity: 3,
    unit: 'balení'
  }).quantity, 3);
});

test('zásoby odmítnou jiné jednotky a necelá balení', () => {
  assert.throws(() => createInventoryPayload('stock', {
    name: 'Mléko',
    quantity: 1,
    unit: 'litr'
  }), /pouze v kg nebo baleních/);

  assert.throws(() => createInventoryPayload('stock', {
    name: 'Rýže',
    quantity: 1.5,
    unit: 'balení'
  }), /celé číslo/);

  assert.throws(() => validateInventoryQuantity(1.5, 'balení'), /celé číslo/);
  assert.equal(validateInventoryQuantity(1.5, 'kg'), 1.5);
});

test('payload mrazáku používá sloupce připravené tabulky', () => {
  assert.deepEqual(createInventoryPayload('freezer', {
    name: 'Lasagne',
    food_id: 12,
    quantity: 2,
    unit: 'porce',
    added_at: '2026-10-04'
  }), {
    food_id: 12,
    name: 'Lasagne',
    quantity: 2,
    unit: 'porce',
    added_at: '2026-10-04',
    notes: null
  });
});

test('endpoint inventáře odmítne požadavek bez přihlášení', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/inventory`);

  assert.ok([401, 503].includes(response.status));
});