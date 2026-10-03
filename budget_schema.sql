-- SQL pro vytvoření globálního rozpočtu, kategorií a transakcí
-- Tato struktura je navržena tak, aby rozpočet byl globální pro všechny měsíce.
-- Pokud změníte rozpočet v jedné kategorii, platí pro celý plán bez ohledu na měsíc.

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Domácí rozpočet',
    currency TEXT NOT NULL DEFAULT 'CZK',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#2d7a5f',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
    month_key TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    transaction_date DATE NOT NULL,
    description TEXT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id
    ON budget_categories (budget_id);

CREATE INDEX IF NOT EXISTS idx_budget_transactions_budget_id_month
    ON budget_transactions (budget_id, month_key);

CREATE INDEX IF NOT EXISTS idx_budget_transactions_category_id
    ON budget_transactions (category_id);

-- Ukázková data pro první nastavení
INSERT INTO budgets (name, currency, is_active)
VALUES ('Domácí rozpočet', 'CZK', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO budget_categories (budget_id, name, type, planned_amount, notes)
SELECT b.id, v.name, v.type, v.amount, v.notes
FROM budgets b
CROSS JOIN (
    VALUES
        ('Mzda', 'income', 35000, 'Příjem'),
        ('Jídlo', 'expense', 12000, 'Potraviny'),
        ('Doprava', 'expense', 6000, 'Benzín a MHD'),
        ('Bydlení', 'expense', 8000, 'Nájem a energie'),
        ('Zábava', 'expense', 2500, 'Volný čas')
) AS v(name, type, amount, notes)
WHERE b.is_active = TRUE
ON CONFLICT DO NOTHING;
