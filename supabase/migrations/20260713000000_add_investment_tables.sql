-- Create investment_assets table
CREATE TABLE IF NOT EXISTS public.investment_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('stocks', 'crypto', 'mutual_funds', 'gold', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, symbol)
);

-- Create investment_records table
CREATE TABLE IF NOT EXISTS public.investment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'dividend')),
    amount NUMERIC(15, 2) NOT NULL,
    price NUMERIC(15, 4),
    units NUMERIC(15, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_records ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can manage their own investment assets" ON public.investment_assets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own investment records" ON public.investment_records
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add Indices
CREATE INDEX IF NOT EXISTS idx_investment_assets_user_id ON public.investment_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_assets_symbol ON public.investment_assets(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_investment_records_user_id ON public.investment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_records_asset_id ON public.investment_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_investment_records_date ON public.investment_records(date);

-- Add updated_at Triggers
CREATE TRIGGER trigger_update_investment_assets_updated_at
    BEFORE UPDATE ON public.investment_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_investment_records_updated_at
    BEFORE UPDATE ON public.investment_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
