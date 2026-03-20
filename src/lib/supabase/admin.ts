import { createClient } from '@supabase/supabase-js'

// service_role_key를 사용하는 admin client (RLS 우회)
// 서버 사이드에서만 사용! 절대 클라이언트에 노출하지 말 것
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
