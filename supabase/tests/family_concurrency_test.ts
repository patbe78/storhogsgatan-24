import { createClient } from 'npm:@supabase/supabase-js@2'
import { assertEquals } from 'jsr:@std/assert@1'

const url = Deno.env.get('FAMILY_TEST_SUPABASE_URL')
const anonKey = Deno.env.get('FAMILY_TEST_SUPABASE_ANON_KEY')
const adminOneToken = Deno.env.get('FAMILY_TEST_ADMIN_ONE_TOKEN')
const adminTwoToken = Deno.env.get('FAMILY_TEST_ADMIN_TWO_TOKEN')
const adminOneId = Deno.env.get('FAMILY_TEST_ADMIN_ONE_ID')
const adminTwoId = Deno.env.get('FAMILY_TEST_ADMIN_TWO_ID')

Deno.test({
  name: 'two concurrent last-admin mutations leave one active admin',
  ignore: !url || !anonKey || !adminOneToken || !adminTwoToken || !adminOneId || !adminTwoId,
  async fn() {
    const one = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${adminOneToken}` } }
    })
    const two = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${adminTwoToken}` } }
    })
    const results = await Promise.all([
      one.rpc('family_update_member_role', { p_profile_id: adminOneId, p_role: 'adult' }),
      two.rpc('family_update_member_role', { p_profile_id: adminTwoId, p_role: 'adult' })
    ])
    assertEquals(results.filter((result) => result.error === null).length, 1)
    assertEquals(
      results.filter((result) => result.error?.message.includes('FAMILY_LAST_ADMIN')).length,
      1
    )
  }
})
