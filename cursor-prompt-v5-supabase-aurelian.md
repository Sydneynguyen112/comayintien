# � PROMPT v5 FINAL: Migrate C� Máy (Prisma � Supabase) + Tích hợp v� o LMS
## Aurelian Academy Design + Supabase Client trực tiếp

---

## � NGỮ CẢNH DỰ �N

Mình �ang s� hữu 2 sản phẩm web phục vụ c�ng ��ng Trader Vi�t:

1. **ROVA LMS** (`https://lmsrova.vercel.app/`) � N�n tảng h�c Trading v�i design system **"Aurelian Academy"** (v� ng-kem-�en, sang tr�ng).
2. **C� Máy Kinh Doanh** (`https://comaytrading.vercel.app/`, repo `rova-co-may/`) � Tool quản tr� kỷ luật rút ti�n cho trader. **Hi�n tại �ang dùng Prisma + tRPC, cần migrate sang Supabase Client trực tiếp khi tích hợp v� o LMS.**

**Mục tiêu kép trong 1 lần:**
1. � Migrate C� Máy: **Prisma + tRPC � Supabase Client trực tiếp**
2. � Tích hợp C� Máy th� nh **module premium add-on** trong LMS, UI kh�p Aurelian Academy

---

## � � TECH STACK M�I (sau migrate)

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL trên Supabase
- **Data Access:** **`@supabase/supabase-js` trực tiếp** (KH�NG dùng Prisma, KH�NG dùng tRPC)
- **Auth:** Supabase Auth
- **Realtime:** Supabase Realtime (cho P&L update live)
- **Storage:** Supabase Storage
- **Server Actions:** Next.js Server Actions (thay tRPC procedures)
- **Toast:** `sonner`
- **Animation:** `canvas-confetti` (giữ từ C� Máy g�c)
- **Test:** Vitest
- **Deploy:** Vercel

� � **Critical:** B� HO�N TO�N Prisma + tRPC. Dùng Supabase client + Server Actions.

---

## � � ��C TRƯ�C KHI CODE

Trư�c khi viết bất kỳ dòng code n� o, ��c kỹ:

1. **`plans/reports/handoff-260504-0819-session-changes.md`** � handoff l�ch sử C� Máy
2. **`app/`, `components/`** � pattern code & UI hi�n tại của LMS
3. **`tailwind.config.ts`** � design tokens hi�n có
4. **`app/globals.css`** � CSS variables theme
5. **`package.json`** � deps �ầy �ủ
6. **`lib/supabase/`** hoặc tương �ương � xem LMS �ã setup Supabase client chưa

**Codebase C� Máy g�c (`rova-co-may/`)** � cần access �� **��c logic Prisma cũ � port sang Supabase**. Nếu chưa có trong workspace, h�i mình cung cấp.

**Phát hi�n thiếu thông tin/conflict � DỪNG v�  h�i mình.**

---

## � DESIGN SYSTEM � AURELIAN ACADEMY

### � Brand Colors (BẮT BU�C)

```ts
// Color tokens chính thức
const brandColors = {
  primary:   '#CD9C20',  // Gold �ậm - CTA chính
  secondary: '#C8AA6F',  // V� ng kem - accent phụ
  tertiary:  '#F2ECDD',  // Kem nhạt - background light mode
  neutral:   '#FAF9F6',  // Off-white - card bg
  
  // Trading-specific (cho C� Máy)
  profit:    '#3B6C4F',  // Xanh lá - lợi nhuận
  loss:      '#C03B3B',  // �� - l�
};
```

### � Tailwind Config (BẮT BU�C)

Update `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      // CSS variables �� swap dark/light
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
      },
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))',
      },
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      
      // Direct brand colors (cho charts, celebration)
      gold: {
        DEFAULT: '#CD9C20',
        soft: '#C8AA6F',
      },
      paper: {
        DEFAULT: '#F2ECDD',
        light: '#FAF9F6',
      },
      profit: '#3B6C4F',
      loss: '#C03B3B',
    },
    fontFamily: {
      sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
    },
    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)',
    }
  }
}
```

### � CSS Variables (BẮT BU�C)

Update `app/globals.css`:

```css
@layer base {
  :root {
    /* === LIGHT MODE === */
    --background: 42 56% 91%;         /* #F2ECDD */
    --foreground: 22 22% 8%;          /* �en ấm */
    
    --card: 40 33% 97%;               /* #FAF9F6 */
    --card-foreground: 22 22% 8%;
    
    --primary: 43 73% 47%;            /* #CD9C20 */
    --primary-foreground: 22 22% 8%;
    
    --secondary: 38 47% 61%;          /* #C8AA6F */
    --secondary-foreground: 22 22% 8%;
    
    --muted: 40 30% 88%;
    --muted-foreground: 30 10% 35%;
    
    --border: 40 25% 80%;
    --input: 40 25% 80%;
    --ring: 43 73% 47%;
    
    --radius: 0.75rem;
  }
  
  .dark {
    /* === DARK MODE === */
    --background: 22 22% 6%;          /* �en ấm sâu */
    --foreground: 42 56% 91%;         /* Kem nhạt */
    
    --card: 22 18% 9%;
    --card-foreground: 42 56% 91%;
    
    --primary: 43 80% 55%;            /* Gold rực hơn trên �en */
    --primary-foreground: 22 22% 8%;
    
    --secondary: 38 47% 61%;
    --secondary-foreground: 22 22% 8%;
    
    --muted: 22 15% 14%;
    --muted-foreground: 40 20% 65%;
    
    --border: 22 12% 18%;
    --input: 22 12% 18%;
    --ring: 43 80% 55%;
  }
}
```

### � Typography

- **Font:** `Manrope` cho TẤT CẢ
- Import qua `next/font/google` trong `app/layout.tsx`
- Verify hi�n th� �ẹp tiếng Vi�t có dấu

### � Button � 5 variants v�i `rounded-full`

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        inverted: "bg-foreground text-background hover:bg-foreground/90",
        outlined: "border-2 border-foreground text-foreground hover:bg-foreground/5 bg-transparent",
        // �ặc thù: nút "Hạ neo" gold (theo handoff)
        anchor: "border-2 border-primary bg-primary text-primary-foreground hover:shadow-md hover:-translate-y-0.5",
        ghost: "hover:bg-muted",
        destructive: "bg-loss text-white hover:bg-loss/90",
      },
      size: {
        sm: "px-4 py-2 text-xs",
        md: "px-6 py-3 text-sm",
        lg: "px-8 py-4 text-base",
        icon: "h-10 w-10 p-0 rounded-lg",
      }
    }
  }
);
```

### � Celebration UX (giữ từ handoff)

- Giữ nguyên `lib/celebrate.ts` v�i `fireworks()` 
- Update palette kh�p Aurelian:
  ```ts
  const colors = ['#CD9C20', '#C8AA6F', '#3B6C4F', '#F2ECDD', '#FAF9F6'];
  ```
- Pattern: withdraw success � fireworks + centered panel � auto close 3.2s

### � Theme Toggle

- Dùng `next-themes`
- Toggle � header (icon moon/sun) � �ã có trong LMS

---

## �� KIẾN TR�C SUPABASE

### Setup Supabase Client

```ts
// lib/supabase/client.ts (Client Component)
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts (Server Component / Server Action)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// lib/supabase/admin.ts (Service role - ch� dùng cho admin tasks)
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

### Database Schema (SQL Migrations)

Dùng **Supabase Migrations** (`supabase/migrations/`) thay cho Prisma. Tạo file:

```sql
-- supabase/migrations/20260504_create_money_machine_schema.sql

-- =====================================================
-- 1. SHARED SCHEMA (public) - Subscriptions
-- =====================================================

CREATE TYPE product_type AS ENUM ('lms_pro', 'lms_coaching', 'money_machine');
CREATE TYPE sub_status AS ENUM ('active', 'expired', 'canceled');

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product     product_type NOT NULL,
  status      sub_status NOT NULL DEFAULT 'active',
  start_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, product, status)
);

CREATE INDEX idx_subscriptions_user_product 
  ON public.subscriptions(user_id, product) 
  WHERE status = 'active';

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. MONEY_MACHINE SCHEMA
-- =====================================================

CREATE SCHEMA IF NOT EXISTS money_machine;
GRANT USAGE ON SCHEMA money_machine TO authenticated;

-- Helper function: ki�m tra user có active subscription không
CREATE OR REPLACE FUNCTION public.has_money_machine_access(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = uid
    AND product = 'money_machine'
    AND status = 'active'
    AND (end_date IS NULL OR end_date > NOW())
  );
$$;

-- Machines table
CREATE TABLE money_machine.machines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  capital           DECIMAL(15, 2) NOT NULL,
  current_anchor    DECIMAL(15, 2) NOT NULL,
  cycle_started_at  TIMESTAMPTZ,  -- Từ handoff: nullable, fallback created_at
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_machines_user ON money_machine.machines(user_id);

ALTER TABLE money_machine.machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own machines if subscribed"
  ON money_machine.machines FOR ALL
  USING (
    auth.uid() = user_id 
    AND public.has_money_machine_access(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND public.has_money_machine_access(auth.uid())
  );

-- Transactions table (nhật ký)
CREATE TYPE money_machine.tx_type AS ENUM (
  'trade_win', 'trade_loss', 'withdraw', 'anchor_change'
);

CREATE TABLE money_machine.transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id  UUID NOT NULL REFERENCES money_machine.machines(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        money_machine.tx_type NOT NULL,
  amount      DECIMAL(15, 2) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_machine ON money_machine.transactions(machine_id, created_at DESC);
CREATE INDEX idx_transactions_user ON money_machine.transactions(user_id);

ALTER TABLE money_machine.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own transactions if subscribed"
  ON money_machine.transactions FOR ALL
  USING (
    auth.uid() = user_id 
    AND public.has_money_machine_access(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND public.has_money_machine_access(auth.uid())
  );

-- Cycle reports (báo cáo)
CREATE TYPE money_machine.cycle_decision AS ENUM ('reset', 'scale');

CREATE TABLE money_machine.cycle_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id  UUID NOT NULL REFERENCES money_machine.machines(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date  TIMESTAMPTZ NOT NULL,  -- machine.cycle_started_at ?? machine.created_at
  end_date    TIMESTAMPTZ NOT NULL,
  decision    money_machine.cycle_decision NOT NULL,
  pnl         DECIMAL(15, 2) NOT NULL,
  withdrawn   DECIMAL(15, 2) NOT NULL,
  meta        JSONB,  -- Audit: { cycle_started_at: <new timestamp> } theo handoff
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_machine ON money_machine.cycle_reports(machine_id, created_at DESC);
CREATE INDEX idx_reports_user ON money_machine.cycle_reports(user_id);

ALTER TABLE money_machine.cycle_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own reports if subscribed"
  ON money_machine.cycle_reports FOR ALL
  USING (
    auth.uid() = user_id 
    AND public.has_money_machine_access(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND public.has_money_machine_access(auth.uid())
  );

-- =====================================================
-- 3. RPC FUNCTION - close_cycle (FIX RACE CONDITION)
-- =====================================================
-- Thay vì l� m transaction � app, dùng Postgres function 
-- �� atomically update machine + insert report

CREATE OR REPLACE FUNCTION money_machine.close_cycle(
  p_machine_id UUID,
  p_decision money_machine.cycle_decision,
  p_pnl DECIMAL,
  p_withdrawn DECIMAL
)
RETURNS money_machine.cycle_reports
LANGUAGE plpgsql
SECURITY INVOKER  -- Dùng quy�n của user �� RLS apply
AS $$
DECLARE
  v_machine money_machine.machines;
  v_report money_machine.cycle_reports;
  v_new_cycle_start TIMESTAMPTZ := NOW();
BEGIN
  -- Lấy machine (RLS sẽ check ownership + subscription)
  SELECT * INTO v_machine 
  FROM money_machine.machines 
  WHERE id = p_machine_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Machine not found or access denied';
  END IF;
  
  -- Insert report (atomic v�i update bên dư�i)
  INSERT INTO money_machine.cycle_reports (
    machine_id, user_id, start_date, end_date, 
    decision, pnl, withdrawn, meta
  ) VALUES (
    v_machine.id,
    v_machine.user_id,
    COALESCE(v_machine.cycle_started_at, v_machine.created_at),
    NOW(),
    p_decision,
    p_pnl,
    p_withdrawn,
    jsonb_build_object('cycle_started_at', v_new_cycle_start)
  ) RETURNING * INTO v_report;
  
  -- Update machine cycle (theo decision)
  UPDATE money_machine.machines
  SET 
    cycle_started_at = v_new_cycle_start,
    updated_at = NOW()
  WHERE id = p_machine_id;
  
  RETURN v_report;
END;
$$;

GRANT EXECUTE ON FUNCTION money_machine.close_cycle TO authenticated;
```

### Server Actions thay tRPC

Pattern m�i: **Server Actions** trong `app/co-may/_actions/`:

```ts
// app/co-may/_actions/machines.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createMachineSchema = z.object({
  name: z.string().min(1).max(100),
  capital: z.number().positive(),
  currentAnchor: z.number().positive(),
});

export async function createMachine(input: z.infer<typeof createMachineSchema>) {
  const parsed = createMachineSchema.parse(input);
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  // RLS sẽ tự ��ng ki�m tra subscription
  const { data, error } = await supabase
    .schema('money_machine')
    .from('machines')
    .insert({
      user_id: user.id,
      name: parsed.name,
      capital: parsed.capital,
      current_anchor: parsed.currentAnchor,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath('/co-may/quan-ly');
  return data;
}

// app/co-may/_actions/cycles.ts
'use server';

export async function closeCycle(input: {
  machineId: string;
  decision: 'reset' | 'scale';
  pnl: number;
  withdrawn: number;
}) {
  const supabase = await createClient();
  
  // G�i Postgres function (�ã atomic) - FIX RACE CONDITION
  const { data, error } = await supabase
    .schema('money_machine')
    .rpc('close_cycle', {
      p_machine_id: input.machineId,
      p_decision: input.decision,
      p_pnl: input.pnl,
      p_withdrawn: input.withdrawn,
    });
  
  if (error) throw error;
  
  revalidatePath('/co-may');
  return data;
}
```

### Realtime Subscription (BONUS từ Supabase)

```ts
// app/co-may/quan-ly/[id]/_components/realtime-pnl.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RealtimePnL({ machineId }: { machineId: string }) {
  const [pnl, setPnl] = useState(0);
  const supabase = createClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`machine:${machineId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'money_machine',
        table: 'transactions',
        filter: `machine_id=eq.${machineId}`,
      }, (payload) => {
        // Update P&L realtime khi có giao d�ch m�i
        setPnl(prev => prev + (payload.new.amount as number));
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [machineId, supabase]);
  
  return <div>P&L: {pnl}</div>;
}
```

---

## � CHỨC N�NG CẦN L�M

### Module m�i: **"C� Máy In Ti�n"** (premium add-on)

```
LMS Sidebar (�ã có)
��� Trang chủ
��� Khoá h�c
��� Mentor
��� Bảng giá
��� � C� Máy In Ti�n  � ch� user có MONEY_MACHINE active
    ��� � T�ng quan & Hi�u suất    � /co-may/tong-quan
    ��� �� Quản lý C� máy            � /co-may/quan-ly
    ��� � L�ch sử & Báo cáo         � /co-may/lich-su
```

### Module 1: **T�ng quan & Hi�u suất** (`/co-may/tong-quan`)

G�p **T�ng quan + Matrix** từ C� Máy g�c.
- KPI cards: T�ng v�n, P&L, Win rate, Drawdown, Days active
  - **Days active** = `(NOW - (cycle_started_at ?? created_at)) / 1 day`
  - Card highlight v�i gold border cho metric quan tr�ng
- Matrix hi�u suất theo machine/th�i gian
- Charts dùng `--profit` (xanh) v�  `--loss` (��)
- **Bonus:** Realtime update khi có giao d�ch m�i (Supabase Realtime)

### Module 2: **Quản lý C� máy** (`/co-may/quan-ly`)

Migrate logic từ `app/(customer)/machines/` của C� Máy g�c:
- List machines (card grid)
- CRUD: tạo/sửa/xoá/kích hoạt/tạm dừng
- Detail page: `/co-may/quan-ly/[id]`
  - Anchor card v�i nút "Hạ neo xu�ng $X" (button variant `anchor`)
  - Trade input
  - **Withdraw modal v�i fireworks celebration** (giữ từ handoff)
  - Close cycle v�i 2 decision: Reset / Scale (qua RPC `close_cycle`)
- Form input: `rounded-lg border-2 focus:ring-primary`

### Module 3: **L�ch sử & Báo cáo** (`/co-may/lich-su`)

G�p **Nhật ký + Báo cáo**.
- Tabs phụ:
  - "Nhật ký": query `money_machine.transactions`, filter theo machine/date/type
  - "Báo cáo": query `money_machine.cycle_reports`, hi�n th� start_date, decision, pnl
- Export PDF/CSV (client-side hoặc qua server action)
- Tab style: underline gold

### Phân quy�n (Premium Add-on)

User chưa mua � v� o `/co-may/*` thấy **paywall**:

```tsx
// app/co-may/_components/paywall-screen.tsx
export function PaywallScreen() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-gradient-to-br from-primary/10 to-secondary/10 
                      border-2 border-primary/30 rounded-3xl p-8 md:p-12 text-center space-y-6">
        <Badge className="bg-primary text-primary-foreground">� Premium Add-on</Badge>
        <h1 className="font-bold text-4xl md:text-6xl">
          Nâng cấp <span className="text-primary">C� Máy In Ti�n</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Quản tr� kỷ luật trading như pro � ��ng b� v�i khoá h�c bạn �ang theo.
        </p>
        <Button variant="primary" size="lg">
          Nâng cấp ngay - 1.990.000�/tháng
        </Button>
        <ul className="text-left max-w-md mx-auto space-y-2">
          <li>� 3 module quản tr� chuyên nghi�p</li>
          <li>� Realtime P&L update</li>
          <li>� Hi�u ứng kỷ luật rút ti�n</li>
          <li>� Báo cáo chu kỳ tự ��ng</li>
        </ul>
      </div>
    </div>
  );
}
```

Logic check qua Server Component:

```tsx
// app/co-may/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { PaywallScreen } from './_components/paywall-screen';

export default async function CoMayLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');
  
  const { data: hasAccess } = await supabase
    .rpc('has_money_machine_access', { uid: user.id });
  
  if (!hasAccess) return <PaywallScreen />;
  
  return (
    <div className="flex">
      <CoMaySidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

---

## � � TECHNICAL DEBT TỪ HANDOFF � �� GIẢI QUYẾT

Theo handoff session 27/4�4/5, có 2 issue chưa fix � C� Máy g�c:

### 1. Race condition trong `closeCycle` � �� FIX
- C� Máy g�c: `cycleReport.create` ngo� i transaction � orphan rows
- **Giải pháp m�i:** Postgres function `money_machine.close_cycle()` (atomic by default)

### 2. Audit log thiếu `cycleStartedAt` � �� FIX
- �ã include `meta = jsonb_build_object('cycle_started_at', v_new_cycle_start)` trong RPC

---

## � C�C BƯ�C TRI�N KHAI

### Bư�c 0: � Setup Design System (L�M �ẦU TI�N)
- [ ] Update `tailwind.config.ts` v�i full color tokens Aurelian
- [ ] Update `app/globals.css` v�i CSS variables 2 mode
- [ ] Verify font Manrope import �úng
- [ ] Tạo/update `components/ui/button.tsx` v�i 5 variants
- [ ] Tạo demo page `/design-test` show tokens
- [ ] **Báo cáo + screenshot 2 mode � mình duy�t**

### Bư�c 1: Setup Supabase Client
- [ ] C� i `@supabase/ssr` v�  `@supabase/supabase-js`
- [ ] Tạo `lib/supabase/client.ts` (browser)
- [ ] Tạo `lib/supabase/server.ts` (server)
- [ ] Tạo `lib/supabase/admin.ts` (service role - cho admin tasks)
- [ ] Update `middleware.ts` cho Supabase Auth refresh
- [ ] Verify env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Bư�c 2: Database Migration
- [ ] Setup Supabase CLI nếu chưa có (`supabase init`, `supabase link`)
- [ ] Tạo file migration `supabase/migrations/20260504_create_money_machine_schema.sql`
- [ ] Copy SQL từ section "Database Schema" � trên
- [ ] Run `supabase db push` hoặc apply qua SQL Editor (theo handoff fallback)
- [ ] Verify schema, tables, RLS, RPC function �ã tạo

### Bư�c 3: Generate TypeScript types
- [ ] Run `supabase gen types typescript --linked > lib/supabase/database.types.ts`
- [ ] Tạo helper types: `Tables<'machines'>`, `Enums<'tx_type'>` v.v.

### Bư�c 4: Server Actions (thay tRPC)
- [ ] Tạo folder `app/co-may/_actions/`
- [ ] Files:
  - `machines.ts`: createMachine, updateMachine, deleteMachine, listMachines, getMachine
  - `transactions.ts`: recordTrade, recordWithdraw
  - `cycles.ts`: closeCycle (g�i RPC)
  - `subscriptions.ts`: checkAccess
- [ ] Validate input v�i Zod schemas
- [ ] Error handling chuẩn

### Bư�c 5: Migrate `lib/celebrate.ts`
- [ ] Copy `lib/celebrate.ts` từ C� Máy g�c
- [ ] Update palette cho kh�p Aurelian
- [ ] C� i `canvas-confetti` + `@types/canvas-confetti`
- [ ] Verify SSR-safe

### Bư�c 6: Routing & Layout
- [ ] `app/co-may/layout.tsx` � check subscription, paywall
- [ ] `app/co-may/_components/sidebar.tsx` � sub-nav 3 module
- [ ] 3 routes: `tong-quan/page.tsx`, `quan-ly/page.tsx`, `lich-su/page.tsx`
- [ ] Sub-route: `quan-ly/[id]/page.tsx`

### Bư�c 7: Migrate UI từng module
- [ ] **Module 1** (T�ng quan & Hi�u suất)
  - Server Component fetch initial data
  - Client Component cho realtime + charts
  - Screenshot so sánh v�i LMS � mình duy�t
- [ ] **Module 2** (Quản lý C� máy)
  - List page
  - Detail page v�i anchor-card (variant `anchor`)
  - Withdraw modal v�i fireworks (giữ UX từ handoff)
  - Close cycle dialog (g�i server action `closeCycle`)
  - Screenshot so sánh � mình duy�t
- [ ] **Module 3** (L�ch sử & Báo cáo)
  - Tabs Nhật ký + Báo cáo
  - Filter, pagination
  - Export PDF/CSV
  - Screenshot so sánh � mình duy�t

### Bư�c 8: Subscription & Payment
- [ ] Component `<PaywallScreen />` v�i gold gradient
- [ ] Update trang Bảng giá thêm gói "C� Máy In Ti�n"
- [ ] Payment flow tạo row trong `subscriptions` v�i `product = 'money_machine'`
- [ ] Webhook xử lý expire/cancel

### Bư�c 9: Navigation & Polish
- [ ] Thêm "C� Máy In Ti�n" v� o sidebar LMS (conditional render theo subscription)
- [ ] CTA "Nâng cấp C� Máy" � dashboard h�c viên
- [ ] Responsive mobile/tablet/desktop

### Bư�c 10: Testing
- [ ] Manual test theo test plan của handoff:
  - Anchor button (gold, hover effect)
  - Withdraw celebration (fireworks + centered panel + auto close 3.2s)
  - Cycle reset day counter (badge v� 0)
  - Cycle report start_date (= cycle_started_at ?? created_at)
- [ ] Vitest tests cho server actions (�ặc bi�t `closeCycle`)
- [ ] Test phân quy�n: user A không xem data user B
- [ ] Test paywall: user không có sub thấy paywall
- [ ] Test RLS bypass: thử fake user_id trong query � phải b� reject

---

## � ACCEPTANCE CRITERIA

1. � **Visual:** �ặt cạnh trang Khoá h�c LMS, không th� phân bi�t C� Máy l�  "ngoại lai"
2. � Color tokens �úng: `#CD9C20`, `#C8AA6F`, `#F2ECDD`, `#FAF9F6`, `#3B6C4F`, `#C03B3B`
3. � Font Manrope render �ẹp tiếng Vi�t có dấu
4. � Button có 5 variants v�i `rounded-full`
5. � Dark + Light mode ��ng b� tuy�t ��i
6. � **B� HO�N TO�N Prisma + tRPC** � ch� dùng Supabase Client + Server Actions
7. � Schema multi-schema �úng (public/lms/money_machine)
8. � RLS policies �ầy �ủ, không leak data
9. � RPC `close_cycle` atomic � không có orphan reports
10. � Audit log meta ghi `cycle_started_at`
11. � Realtime P&L update hoạt ��ng
12. � Fireworks celebration giữ nguyên UX
13. � Anchor button gold, hover effect �úng
14. � Day counter reset v� 0 sau closeCycle
15. � Paywall �ẹp, gold gradient, CTA rõ
16. � H�c viên mua �ược add-on qua trang pricing
17. � Không phá tính n�ng LMS hi�n có
18. � Vitest tests pass

---

## � LƯU � QUAN TR�NG

### Database
- **KH�NG** dùng Prisma trong project m�i � ch� Supabase Client
- **KH�NG** dùng tRPC � dùng Server Actions
- **KH�NG** tạo Supabase project m�i � dùng project LMS hi�n có
- **KH�NG** �ụng schema `lms` �ang có
- **KH�NG** b� qua RLS policies
- **PHẢI** dùng RPC function cho transaction phức tạp (close_cycle)
- **PHẢI** check subscription qua RLS hoặc helper function

### UI/UX
- **KH�NG** copy nguyên CSS từ C� Máy g�c � phải refactor theo Aurelian
- **KH�NG** dùng font khác Manrope
- **KH�NG** dùng `rounded-md` cho button chính (phải `rounded-full`)
- **PHẢI** giữ fireworks celebration UX
- **PHẢI** giữ anchor button gold-style

### Process
- **KH�NG** code module trư�c khi xong Bư�c 0 (Setup Design System)
- **PHẢI** screenshot báo cáo từng module
- **PHẢI** h�i mình nếu phân vân kiến trúc

---

## � TIPS MIGRATE TỪ PRISMA

Khi ��c code C� Máy g�c v�  port sang Supabase, theo pattern n� y:

| Prisma | Supabase |
|---|---|
| `ctx.db.machine.findMany({ where: { userId } })` | `supabase.schema('money_machine').from('machines').select().eq('user_id', userId)` |
| `ctx.db.machine.create({ data: {...} })` | `supabase.schema('money_machine').from('machines').insert({...}).select().single()` |
| `ctx.db.machine.update({ where: {id}, data: {...} })` | `supabase.schema('money_machine').from('machines').update({...}).eq('id', id)` |
| `ctx.db.$transaction([...])` | RPC function (Postgres `BEGIN/COMMIT`) |
| `include: { transactions: true }` | `select('*, transactions(*)')` |
| Where ownership check | RLS auto handle |

---

## � BẮT �ẦU

Hãy:
1. **��c** handoff file + codebase LMS + (nếu có) codebase C� Máy g�c
2. **Báo cáo** cho mình:
   - Stack hi�n tại của LMS (Next version, Supabase �ã setup chưa, có dùng `@supabase/ssr` chưa)
   - Tình trạng design tokens hi�n có vs Aurelian
   - Schema hi�n tại, có cần �i�u ch�nh gì �� multi-schema không
   - Mapping logic Prisma � Supabase cho các function chính
   - Kế hoạch chi tiết v�i timeline (10 bư�c)
3. **Ch� mình duy�t** r�i bắt �ầu Bư�c 0: Setup Design System

Sẵn s� ng chưa? Bắt �ầu n� o! ��
