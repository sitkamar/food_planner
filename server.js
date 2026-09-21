require('dotenv').config();

const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const baseDir = __dirname;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Chybí konfigurace Supabase. Nastav SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY pro serverové ověření přístupu.');
}

const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

function normalizeFoodRow(row, categoryMap, supercategoryMap, subcategoryMap, typeMap) {
  const categoryEntry = categoryMap.get(row.category_id) || { name: row.category_name || 'Neurčeno', supercategory_id: row.supercategory_id || null };
  const resolvedSupercategoryId = row.supercategory_id || categoryEntry.supercategory_id || null;
  const supercategoryMeta = supercategoryMap.get(resolvedSupercategoryId) || { name: row.supercategory_name || 'Neurčeno', food_type_id: null };
  const supercategory = supercategoryMeta.name || row.supercategory_name || 'Neurčeno';
  const category = categoryEntry.name || row.category_name || 'Neurčeno';
  const subcategory = subcategoryMap.get(row.subcategory_id) || row.subcategory_name || null;
  const foodType = typeMap.get(supercategoryMeta.food_type_id) || row.food_type_name || supercategory;

  return {
    id: row.id,
    name: row.name,
    is_active: row.is_active,
    supercategory,
    category,
    subcategory,
    foodType,
    classification: [supercategory, category, subcategory].filter(Boolean).join(' / '),
    fullLabel: [supercategory, category, subcategory].filter(Boolean).join(' · ')
  };
}

app.use(express.json());

app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl,
    supabasePublishableKey
  });
});

app.post('/api/check-invite', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, message: 'Zadejte platný e-mail.' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, message: 'Chybí konfigurace Supabase.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('access_invites')
      .select('id, email')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(403).json({ ok: false, message: 'Tento e-mail nemá povolení pro vytvoření účtu.' });
    }

    return res.json({ ok: true, message: 'E-mail je na seznamu pozvaných uživatelů.' });
  } catch (error) {
    console.error('Chyba při ověřování pozvánky:', error);
    return res.status(500).json({ ok: false, message: 'Nepodařilo se ověřit přístup pro tento e-mail.' });
  }
});

app.post('/api/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !email.includes('@') || !password || password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Zadejte platný e-mail a heslo (min. 6 znaků).' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, message: 'Chybí konfigurace Supabase.' });
  }

  try {
    // ověření pozvánky
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('access_invites')
      .select('id, email, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) {
      return res.status(403).json({ ok: false, message: 'Tento e-mail nemá povolení pro vytvoření účtu.' });
    }

    // vytvoření uživatele přes service role (admin)
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      console.error('Chyba při vytváření uživatele:', createError);
      return res.status(500).json({ ok: false, message: createError.message || 'Nepodařilo se vytvořit uživatele.' });
    }

    // označíme pozvánku jako přijatou
    try {
      await supabaseAdmin.from('access_invites').update({ accepted_at: new Date().toISOString() }).eq('email', email);
    } catch (e) {
      console.warn('Nepodařilo se aktualizovat accepted_at pro invite:', e?.message || e);
    }

    return res.json({ ok: true, user: created, message: 'Účet vytvořen serverově. Přihlaste se prosím.' });
  } catch (error) {
    console.error('Chyba v /api/register:', error);
    return res.status(500).json({ ok: false, message: 'Chyba při vytváření účtu.' });
  }
});

app.get('/api/health', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      ok: false,
      status: 'missing-config',
      message: 'Chybí konfigurace Supabase. Nastav SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY.'
    });
  }

  try {
    const { count, error } = await supabaseAdmin.from('foods').select('id', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    res.json({
      ok: true,
      status: 'healthy',
      totalFoods: count ?? 0
    });
  } catch (error) {
    console.error('Chyba při ověřování databázového připojení:', error);
    res.status(500).json({
      ok: false,
      status: 'error',
      message: 'Databáze není dostupná.'
    });
  }
});

app.get('/api/access-check', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, message: 'Chybí konfigurace Supabase.' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Chybí přístupový token.' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user || !user.email) {
      return res.status(403).json({ ok: false, message: 'Neplatná nebo vypršelá relace.' });
    }

    const normalizedEmail = user.email.trim().toLowerCase();
    const { data, error: inviteError } = await supabaseAdmin
      .from('access_invites')
      .select('id, email')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (inviteError) {
      throw inviteError;
    }

    if (!data) {
      return res.status(403).json({ ok: false, message: 'Váš e-mail není na seznamu pozvaných uživatelů.' });
    }

    return res.json({ ok: true, email: normalizedEmail, allowed: true });
  } catch (error) {
    console.error('Chyba při kontrole přístupu:', error);
    return res.status(500).json({ ok: false, message: 'Nepodařilo se ověřit přístup.' });
  }
});

app.get('/api/supercategories', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, message: 'Chybí konfigurace Supabase.' });
  }

  try {
    const [supercategoriesResult, typesResult] = await Promise.all([
      supabaseAdmin
        .from('food_supercategories')
        .select('id, name, food_type_id')
        .order('name', { ascending: true }),
      supabaseAdmin
        .from('food_types')
        .select('id, name')
    ]);

    if (supercategoriesResult.error) {
      throw supercategoriesResult.error;
    }

    if (typesResult.error) {
      throw typesResult.error;
    }

    const typeMap = new Map((typesResult.data || []).map((type) => [type.id, type.name]));

    res.json({
      ok: true,
      items: (supercategoriesResult.data || []).map((supercategory) => ({
        id: supercategory.id,
        name: supercategory.name,
        food_type_id: supercategory.food_type_id,
        food_type_name: typeMap.get(supercategory.food_type_id) || null
      }))
    });
  } catch (error) {
    console.error('Chyba při načítání superkategorií:', error);
    res.status(500).json({
      ok: false,
      message: 'Nepodařilo se načíst seznam nadkategorií.'
    });
  }
});

app.get('/api/foods', async (req, res) => {
  try {
    const [foodsResult, categoriesResult, supercategoriesResult, subcategoriesResult, typesResult] = await Promise.all([
      supabaseAdmin
        .from('foods')
        .select('id, name, is_active, supercategory_id, category_id, subcategory_id')
        .order('name', { ascending: true }),
      supabaseAdmin
        .from('food_categories')
        .select('id, name, supercategory_id'),
      supabaseAdmin
        .from('food_supercategories')
        .select('id, name, food_type_id'),
      supabaseAdmin
        .from('food_subcategories')
        .select('id, name'),
      supabaseAdmin
        .from('food_types')
        .select('id, name')
    ]);

    const foodsError = foodsResult.error;
    const categoriesError = categoriesResult.error;
    const supercategoriesError = supercategoriesResult.error;
    const subcategoriesError = subcategoriesResult.error;
    const typesError = typesResult.error;

    if (foodsError || categoriesError || supercategoriesError || subcategoriesError || typesError) {
      throw foodsError || categoriesError || supercategoriesError || subcategoriesError || typesError;
    }

    const categoryMap = new Map((categoriesResult.data || []).map((category) => [category.id, {
      name: category.name,
      supercategory_id: category.supercategory_id
    }]));
    const supercategoryMap = new Map((supercategoriesResult.data || []).map((supercategory) => [supercategory.id, {
      name: supercategory.name,
      food_type_id: supercategory.food_type_id
    }]));
    const subcategoryMap = new Map((subcategoriesResult.data || []).map((subcategory) => [subcategory.id, subcategory.name]));
    const typeMap = new Map((typesResult.data || []).map((type) => [type.id, type.name]));

    const items = (foodsResult.data || []).map((row) => normalizeFoodRow(row, categoryMap, supercategoryMap, subcategoryMap, typeMap));

    res.json({
      items,
      count: items.length
    });
  } catch (error) {
    console.error('Chyba při načítání jídel z databáze:', error);
    res.status(500).json({
      ok: false,
      message: 'Nepodařilo se načíst jídla z databáze.',
      details: error.message || 'Neznámá chyba databáze.'
    });
  }
});

app.get('/api/weekly-plans', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, message: 'Chybí konfigurace Supabase.' });
  }

  try {
    const weekStartDate = String(req.query.week_start_date || '').trim();

    const plansQuery = supabaseAdmin
      .from('weekly_plans')
      .select('id, week_start_date')
      .order('week_start_date', { ascending: true });

    if (weekStartDate) {
      plansQuery.eq('week_start_date', weekStartDate);
    }

    const { data: plansData, error: plansError } = await plansQuery;

    if (plansError) {
      throw plansError;
    }

    if (!plansData || !plansData.length) {
      return res.json({ ok: true, items: [] });
    }

    const planIds = plansData.map((plan) => plan.id);
    const { data: slotsData, error: slotsError } = await supabaseAdmin
      .from('weekly_plan_slots')
      .select('weekly_plan_id, slot_group, slot_index, food_id')
      .in('weekly_plan_id', planIds);

    if (slotsError) {
      throw slotsError;
    }

    const foodIds = [...new Set((slotsData || []).map((slot) => slot.food_id).filter(Boolean))];
    const foodMap = new Map();

    if (foodIds.length) {
      const { data: foodsData, error: foodsError } = await supabaseAdmin
        .from('foods')
        .select('id, name')
        .in('id', foodIds);

      if (foodsError) {
        throw foodsError;
      }

      (foodsData || []).forEach((food) => foodMap.set(food.id, food.name));
    }

    const items = (plansData || []).map((plan) => {
      const weekItems = {};
      const weekSlots = {};
      const weekFoodIds = {};

      (slotsData || [])
        .filter((slot) => slot.weekly_plan_id === plan.id)
        .forEach((slot) => {
          const slotKey = `${slot.slot_group}_${slot.slot_index}`;
          const foodName = slot.food_id ? foodMap.get(slot.food_id) || '' : '';

          if (!weekSlots[slot.slot_group]) {
            weekSlots[slot.slot_group] = [];
          }

          weekSlots[slot.slot_group].push(slotKey);
          weekItems[slotKey] = foodName;
          weekFoodIds[slotKey] = slot.food_id || null;
        });

      return {
        week_start_date: plan.week_start_date,
        slots: weekSlots,
        items: weekItems,
        food_ids: weekFoodIds
      };
    });

    return res.json({ ok: true, items });
  } catch (error) {
    console.error('Chyba při načítání týdenního plánu:', error);
    return res.status(500).json({
      ok: false,
      message: 'Nepodařilo se načíst plán týdne.',
      details: error.message || 'Neznámá chyba databáze.'
    });
  }
});

app.post('/api/weekly-plans', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, message: 'Chybí konfigurace Supabase.' });
  }

  try {
    const weekStartDate = String(req.body?.week_start_date || '').trim();
    const slotRows = Array.isArray(req.body?.slots) ? req.body.slots : [];

    if (!weekStartDate) {
      return res.status(400).json({ ok: false, message: 'Chybí datum začátku týdne.' });
    }

    const { data: existingPlan, error: existingPlanError } = await supabaseAdmin
      .from('weekly_plans')
      .select('id')
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (existingPlanError) {
      throw existingPlanError;
    }

    const planPayload = {
      week_start_date: weekStartDate,
      title: `Týden ${weekStartDate}`
    };

    const upsertResult = existingPlan
      ? await supabaseAdmin.from('weekly_plans').update(planPayload).eq('id', existingPlan.id)
      : await supabaseAdmin.from('weekly_plans').insert([planPayload]);

    if (upsertResult.error) {
      throw upsertResult.error;
    }

    const { data: savedPlan, error: savedPlanError } = await supabaseAdmin
      .from('weekly_plans')
      .select('id')
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (savedPlanError) {
      throw savedPlanError;
    }

    if (!savedPlan) {
      return res.status(500).json({ ok: false, message: 'Nepodařilo se vytvořit plán týdne.' });
    }

    const validFoods = slotRows
      .filter((slot) => slot && typeof slot.slot_group === 'string' && typeof slot.slot_index === 'number')
      .map((slot) => String(slot.food_name || '').trim())
      .filter(Boolean);

    const foodNameMap = new Map();

    if (validFoods.length) {
      const { data: foodRows, error: foodRowsError } = await supabaseAdmin
        .from('foods')
        .select('id, name')
        .in('name', [...new Set(validFoods)]);

      if (foodRowsError) {
        throw foodRowsError;
      }

      (foodRows || []).forEach((food) => {
        foodNameMap.set(String(food.name).trim().toLowerCase(), food.id);
      });
    }

    await supabaseAdmin
      .from('weekly_plan_slots')
      .delete()
      .eq('weekly_plan_id', savedPlan.id);

    const rowsToInsert = slotRows
      .filter((slot) => slot && typeof slot.slot_group === 'string' && Number.isFinite(Number(slot.slot_index)))
      .map((slot) => {
        const candidateFoodId = Number(slot.food_id);
        const foodName = String(slot.food_name || '').trim();

        if (!foodName && !(Number.isFinite(candidateFoodId) && candidateFoodId > 0)) {
          return null;
        }

        const resolvedFoodId = Number.isFinite(candidateFoodId) && candidateFoodId > 0
          ? candidateFoodId
          : foodNameMap.get(foodName.toLowerCase());

        if (!resolvedFoodId) {
          return null;
        }

        return {
          weekly_plan_id: savedPlan.id,
          slot_group: slot.slot_group,
          slot_index: Number(slot.slot_index),
          food_id: Number(resolvedFoodId)
        };
      })
      .filter(Boolean);

    if (rowsToInsert.length) {
      const { error: insertError } = await supabaseAdmin
        .from('weekly_plan_slots')
        .insert(rowsToInsert);

      if (insertError) {
        throw insertError;
      }
    }

    return res.json({
      ok: true,
      message: 'Týdenní plán byl uložen.',
      week_start_date: weekStartDate,
      saved: rowsToInsert.length
    });
  } catch (error) {
    console.error('Chyba při ukládání týdenního plánu:', error);
    return res.status(500).json({
      ok: false,
      message: 'Nepodařilo se uložit týdenní plán.',
      details: error.message || 'Neznámá chyba databáze.'
    });
  }
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(baseDir, 'login.html'));
});

app.get('/logout', (req, res) => {
  res.redirect('/login.html');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(baseDir, 'index.html'));
});

app.use(express.static(baseDir));

app.listen(PORT, () => {
  console.log(`Food Planner běží na http://localhost:${PORT}`);
});
