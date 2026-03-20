'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface BillingItem {
  sequence: number
  order_date: string
  ready_made: string
  attribute01: string
  attribute02: string
  attribute03: string
  attribute04: string
  color_count: string
  print_name: string
  process_method: string
  quantity: number
  unit_price: number
  amount: number
  vat: number
  total: number
}

interface BillingData {
  items: BillingItem[]
  customer: { customer_name: string; phone_number?: string; payment?: string }
  company: { company_name?: string; phone_number?: string; account?: string; owner_name?: string; address?: string; uptae?: string; jongmok?: string; business_id?: string }
  period: { startDate: string; endDate: string; label: string }
  summary: { count: number; sumAmount: number; sumVat: number; total: number }
}

export default function BillingDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const customerId = params.customerId as string
  const period = searchParams.get('period') || '이번달'

  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !customerId) return
    setLoading(true)
    const urlParams = new URLSearchParams({
      seller_id: user.companyId,
      customer_id: customerId,
      period,
    })
    fetch(`/api/billing/details?${urlParams}`)
      .then(res => res.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [user, customerId, period])

  if (!user) return null
  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
  if (!data || data.items.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>해당 기간의 청구 내역이 없습니다.</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* 인쇄 버튼 */}
      <div className="no-print" style={{ textAlign: 'right', marginBottom: '10px' }}>
        <Button variant="outline" onClick={() => window.print()}>인쇄</Button>
      </div>

      {/* 거래처명 */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'darkblue' }}>
          {data.customer.customer_name}
        </span>
      </div>

      {/* 기간 */}
      <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '16px', color: '#666' }}>
        {data.period.startDate} ~ {data.period.endDate} ({data.period.label})
      </div>

      {/* 청구서 품목 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#ccffcc' }}>
            <th style={thStyle}>순번</th>
            <th style={thStyle}>주문일자</th>
            <th style={thStyle}>종류</th>
            <th style={thStyle}>품명</th>
            <th style={thStyle}>색깔</th>
            <th style={thStyle}>두께</th>
            <th style={thStyle}>사이즈</th>
            <th style={thStyle}>도수</th>
            <th style={thStyle}>인쇄명</th>
            <th style={thStyle}>가공방식</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>수량</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>단가</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>공급가</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>세액</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>합계</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.sequence} style={{
              borderBottom: '1px solid #ddd',
              color: item.amount < 0 ? 'red' : undefined,
            }}>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{item.sequence}</td>
              <td style={tdStyle}>{item.order_date}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{item.ready_made}</td>
              <td style={tdStyle}>{item.attribute01}</td>
              <td style={tdStyle}>{item.attribute02}</td>
              <td style={tdStyle}>{item.attribute03}</td>
              <td style={tdStyle}>{item.attribute04}</td>
              <td style={tdStyle}>{item.color_count}</td>
              <td style={tdStyle}>{item.print_name}</td>
              <td style={tdStyle}>{item.process_method}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{item.quantity.toLocaleString()}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{item.unit_price.toLocaleString()}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{item.amount.toLocaleString()}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{item.vat.toLocaleString()}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{item.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
            <td colSpan={10} style={{ ...tdStyle, textAlign: 'right' }}>합계</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{data.items.reduce((s, i) => s + i.quantity, 0).toLocaleString()}</td>
            <td style={tdStyle}></td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{data.summary.sumAmount.toLocaleString()}</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{data.summary.sumVat.toLocaleString()}</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontSize: '14px' }}>{data.summary.total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {/* 하단 요약 */}
      <div style={{ backgroundColor: 'whitesmoke', padding: '15px', border: '1px solid #ddd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>공급자</p>
            {data.company.business_id && <p>등록번호: {data.company.business_id}</p>}
            {data.company.company_name && <p>상호: {data.company.company_name}</p>}
            {data.company.owner_name && <p>대표자: {data.company.owner_name}</p>}
            {data.company.address && <p>주소: {data.company.address}</p>}
            {data.company.uptae && <p>업태: {data.company.uptae}</p>}
            {data.company.jongmok && <p>종목: {data.company.jongmok}</p>}
            {data.company.phone_number && <p>연락처: {data.company.phone_number}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>청구 요약</p>
            <p>건수: {data.summary.count}건</p>
            <p>공급가: {data.summary.sumAmount.toLocaleString()}원</p>
            <p>세액: {data.summary.sumVat.toLocaleString()}원</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '6px' }}>
              합계: {data.summary.total.toLocaleString()}원
            </p>
            {data.company.account && (
              <p style={{ marginTop: '10px', color: 'blue' }}>입금계좌: {data.company.account}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '3px 5px', border: '1px solid silver', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '12px' }
const tdStyle: React.CSSProperties = { padding: '3px 5px', border: '1px solid silver', fontSize: '12px' }
