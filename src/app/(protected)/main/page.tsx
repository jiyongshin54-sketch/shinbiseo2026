import { createClient } from '@/lib/supabase/server'
import { DisplayBoard } from '@/components/orders/display-board'
import { CompanyAnnouncementPanel } from '@/components/announcements/company-announcement-panel'

export default async function MainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dbUser } = await supabase
    .from('users')
    .select(`
      user_id, user_name, power, company_id,
      companies ( company_name, company_alias, power )
    `)
    .eq('auth_uid', user!.id)
    .single()

  const company = Array.isArray(dbUser?.companies)
    ? dbUser?.companies[0]
    : dbUser?.companies

  return (
    <div>
      {/* 구 앱 메인 화면: 좌32% + 우68% */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {/* 상단 행 */}
          <tr>
            {/* 좌측: 주요 판매회사 바로가기 */}
            <td
              style={{
                width: '32%',
                verticalAlign: 'top',
                padding: '5px',
                border: '1px solid dodgerblue',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                주요 판매회사 바로가기
              </h3>
              {/* 오른쪽 필터바 높이만큼 여백 (제목+필터바 = 약 30px) */}
              <div style={{ height: '28px' }} />

              {/* 풍원비닐포장 + 공지사항 */}
              <CompanyAnnouncementPanel
                companyId="00002"
                companyName="풍원비닐포장"
                logoSrc="/images/company-logos/pungwon.png"
                gradientFrom="#4ade80"
                gradientTo="#60a5fa"
                href="/pungwon"
              />
            </td>

            {/* 우측: 내 주문 전광판 */}
            <td
              style={{
                width: '68%',
                verticalAlign: 'top',
                padding: '5px',
                border: '1px solid dodgerblue',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                내 주문 전광판
              </h3>
              <DisplayBoard />
            </td>
          </tr>

          {/* 하단 행 */}
          <tr>
            {/* 좌측: 공지사항 */}
            <td style={{ verticalAlign: 'top', padding: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                신비서 공지사항
              </h3>
              <p style={{ fontSize: '13px', color: '#333' }}>
                신비서 새로운 버전을 준비하고 있습니다.
              </p>
              <p style={{ fontSize: '13px', color: 'red', marginTop: '5px' }}>
                테스트만 가능하고 아직 실제로 사용할 수 없습니다.
              </p>
            </td>

            {/* 우측: 광고/안내 */}
            <td style={{ verticalAlign: 'top', padding: '10px' }}>
              <p style={{ fontSize: '16px', fontWeight: 'bold' }}>
                신BS는 네이버 공식대행사 포이시스와 함께 여러분의 성공을 돕겠습니다!
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
