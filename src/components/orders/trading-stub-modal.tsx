'use client'

import { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { DisplayBoardOrder } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  order: DisplayBoardOrder | null
  open: boolean
  onClose: () => void
}

interface StubDetail {
  sequence: number
  category_id: string | null
  description: string | null
  standard: string | null
  unit_price: number
  quantity: number
  amount: number
  vat: number
  d_comment: string | null
}

interface StubData {
  ts_id: string
  issue_date: string
  sum_amount: number
  sum_vat: number
  total_amount: number
  payment_method: string | null
  comment: string | null
  items: StubDetail[]
  seller: {
    company_name: string
    biz_no: string
    representative: string
    address: string
    biz_type: string
    biz_category: string
    phone: string
  }
  buyer: {
    company_name: string
    biz_no: string
    representative: string
    address: string
    biz_type: string
    biz_category: string
    phone: string
  }
}

export function TradingStubModal({ order, open, onClose }: Props) {
  const [stub, setStub] = useState<StubData | null>(null)
  const [loading, setLoading] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (order && open) {
      fetchOrCreateStub()
    }
  }, [order?.order_id, open])

  const fetchOrCreateStub = async () => {
    if (!order) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/trading-stubs/by-order?order_id=${order.order_id}&seller_id=${order.seller_id}`
      )
      if (res.ok) {
        const data = await res.json()
        setStub(data)
      }
    } catch (err) {
      console.error('명세표 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleIssue = async () => {
    if (!order || !stub) return
    if (stub.ts_id) {
      toast.info('이미 발급된 명세표입니다.')
      return
    }
    setIssuing(true)
    try {
      const res = await fetch('/api/trading-stubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: order.seller_id,
          order_id: order.order_id,
          customer_id: order.customer_id,
          issue_date: stub.issue_date,
          items: stub.items.map(item => ({
            category_id: item.category_id,
            description: item.description,
            standard: item.standard,
            unit_price: item.unit_price,
            quantity: item.quantity,
            amount: item.amount,
            vat: item.vat,
          })),
          sum_amount: stub.sum_amount,
          sum_vat: stub.sum_vat,
          total_amount: stub.total_amount,
          payment_method: stub.payment_method || '',
          comment: stub.comment || '',
        }),
      })
      const result = await res.json()
      if (result.ts_id) {
        toast.success('명세표가 발급되었습니다.')
        fetchOrCreateStub()
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('발급 실패')
    } finally {
      setIssuing(false)
    }
  }

  const handlePrint = () => {
    if (!printRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>거래명세표</title>
          <style>
            body { margin: 20px; font-family: 'Malgun Gothic', sans-serif; }
            table { border-collapse: collapse; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${printRef.current.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (!order) return null

  const today = new Date()
  const todayStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="!max-w-[950px] w-[75vw] h-[88vh] overflow-hidden flex flex-col p-0 gap-0 rounded-none border-0"
        showCloseButton={false}
      >
        {/* 상단 바 */}
        <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ backgroundColor: '#2d2d3d' }}>
          <span className="text-white font-bold text-sm">거래명세표</span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 rounded text-white text-sm font-bold"
              style={{ backgroundColor: '#7c3aed' }}
              onClick={handleIssue}
              disabled={issuing}
            >
              {issuing ? '발급중...' : '발급'}
            </button>
            <button
              className="px-4 py-1.5 rounded text-white text-sm font-bold"
              style={{ backgroundColor: '#2563eb' }}
              onClick={handlePrint}
            >
              인쇄
            </button>
            <button
              className="text-white text-xl font-bold px-2 hover:text-gray-300"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {/* 명세표 본문 - 스크롤 없이 꽉 차게 */}
        <div className="flex-1 bg-white px-5 pt-4 pb-2 flex flex-col min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              명세표를 불러오는 중...
            </div>
          ) : stub ? (
            <>
              <div ref={printRef} className="flex flex-col flex-1 min-h-0">
                <StubDocument stub={stub} />
              </div>
              <div className="text-center text-gray-400 text-xs py-2 shrink-0">
                본 명세표는 {todayStr} 조회되었습니다.
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">명세표 데이터를 불러올 수 없습니다.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ========== 명세표 문서 ==========
function StubDocument({ stub }: { stub: StubData }) {
  const s = stub.seller
  const b = stub.buyer

  const bd = '1px solid #333'
  const bg = '#f5f5f0'
  const fs = '12.5px'

  const c = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: bd, padding: '3px 6px', fontSize: fs, ...extra,
  })
  const lbl = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: bd, padding: '3px 6px', fontSize: fs, backgroundColor: bg,
    textAlign: 'center', fontWeight: 'bold', ...extra,
  })

  const infoRows: [string, string, string][] = [
    ['사업자번호', s.biz_no, b.biz_no],
    ['상호', s.company_name, b.company_name],
    ['성명', s.representative, b.representative],
    ['주소', s.address, b.address],
    ['업태', s.biz_type, b.biz_type],
    ['종목', s.biz_category, b.biz_category],
    ['전화', s.phone, b.phone],
  ]

  // 빈 행 수: 최소 10행, 데이터가 10개 이상이면 0
  const emptyRows = Math.max(0, 10 - stub.items.length)

  return (
    <div style={{ fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif", display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* 외곽 테두리 */}
      <div style={{ border: '2px solid #333', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* ===== 제목 + 일자 ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '68%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={{ ...c(), textAlign: 'center', fontSize: '22px', fontWeight: 'bold', letterSpacing: '16px', padding: '10px 8px', borderTop: 'none', borderLeft: 'none' }}>
                거 래 명 세 표
              </td>
              <td style={{ ...lbl(), borderTop: 'none' }}>일자</td>
              <td style={{ ...c(), textAlign: 'center', fontSize: '13px', borderTop: 'none', borderRight: 'none' }}>
                {formatStubDate(stub.issue_date)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== 공급자 / 공급받는자 ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <colgroup>
            {/* 공급자: 라벨 12% + 값 38% = 50% */}
            <col style={{ width: '12%' }} />
            <col style={{ width: '38%' }} />
            {/* 공급받는자: 라벨 12% + 값 38% = 50% */}
            <col style={{ width: '12%' }} />
            <col style={{ width: '38%' }} />
          </colgroup>
          <tbody>
            {/* 공급자 / 공급받는자 헤더 */}
            <tr>
              <td colSpan={2} style={{ ...lbl(), fontSize: '13px', padding: '5px', borderLeft: 'none' }}>공급자</td>
              <td colSpan={2} style={{ ...lbl(), fontSize: '13px', padding: '5px', borderRight: 'none' }}>공급받는자</td>
            </tr>
            {/* 정보 7행 */}
            {infoRows.map(([label, left, right]) => (
              <tr key={label}>
                <td style={{ ...lbl(), borderLeft: 'none' }}>{label}</td>
                <td style={c({
                  textAlign: label === '주소' ? 'left' : 'center',
                  fontSize: label === '주소' ? '11px' : fs,
                  whiteSpace: label === '주소' ? 'normal' : 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                })}>{left || ''}</td>
                <td style={lbl()}>{label}</td>
                <td style={c({
                  textAlign: label === '주소' ? 'left' : 'center',
                  fontSize: label === '주소' ? '11px' : fs,
                  whiteSpace: label === '주소' ? 'normal' : 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderRight: 'none',
                })}>{right || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== 품목 + 하단 합계 (하나의 테이블로 통합) ===== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', flex: 1, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '7%' }} />
            </colgroup>
            <thead>
              <tr>
                <td style={{ ...lbl(), borderLeft: 'none' }}>No.</td>
                <td style={lbl()}>카테고리</td>
                <td style={lbl()}>품목</td>
                <td style={lbl()}>규격</td>
                <td style={lbl()}>단가</td>
                <td style={lbl()}>수량</td>
                <td style={lbl()}>공급가액</td>
                <td style={{ ...lbl(), borderRight: 'none' }}>세액</td>
              </tr>
            </thead>
            <tbody>
              {stub.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ ...c({ textAlign: 'center' }), borderLeft: 'none' }}>{idx + 1}</td>
                  <td style={c({ fontSize: '11px' })}>{item.category_id || ''}</td>
                  <td style={c()}>{item.description || ''}</td>
                  <td style={c()}>{item.standard || ''}</td>
                  <td style={c({ textAlign: 'right' })}>{Number(item.unit_price).toLocaleString()}</td>
                  <td style={c({ textAlign: 'right' })}>{Number(item.quantity).toLocaleString()}</td>
                  <td style={c({ textAlign: 'right', fontWeight: 'bold' })}>{Number(item.amount).toLocaleString()}</td>
                  <td style={{ ...c({ textAlign: 'right' }), borderRight: 'none' }}>{Number(item.vat).toLocaleString()}</td>
                </tr>
              ))}
              {/* 빈 행 */}
              {Array.from({ length: emptyRows }).map((_, idx) => (
                <tr key={`e-${idx}`} style={idx === emptyRows - 1 ? { height: '100%' } : undefined}>
                  <td style={{ ...c(), borderLeft: 'none' }}>&nbsp;</td>
                  <td style={c()}>&nbsp;</td>
                  <td style={c()}>&nbsp;</td>
                  <td style={c()}>&nbsp;</td>
                  <td style={c()}>&nbsp;</td>
                  <td style={c()}>&nbsp;</td>
                  <td style={c()}>&nbsp;</td>
                  <td style={{ ...c(), borderRight: 'none' }}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...lbl(), borderLeft: 'none' }}>계</td>
                <td style={c({ textAlign: 'center' })}>{stub.items.length}</td>
                <td style={c()} />
                <td style={c()} />
                <td style={c()} />
                <td style={lbl()}>공급가액</td>
                <td style={lbl()}>세액</td>
                <td style={{ ...lbl(), borderRight: 'none' }}>합계</td>
              </tr>
              <tr>
                <td style={{ ...lbl(), borderLeft: 'none' }}>현금</td>
                <td style={c()} />
                <td style={lbl()}>수표</td>
                <td style={c()} />
                <td style={c()} />
                <td style={c({ textAlign: 'right', fontWeight: 'bold' })}>{stub.sum_amount.toLocaleString()}</td>
                <td style={c({ textAlign: 'right' })}>{stub.sum_vat.toLocaleString()}</td>
                <td style={{ ...c({ textAlign: 'right', fontWeight: 'bold', color: '#dc2626', fontSize: '14px' }), borderRight: 'none' }}>{stub.total_amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ ...lbl(), borderLeft: 'none' }}>어음</td>
                <td style={c()} />
                <td style={lbl()}>외상</td>
                <td style={c()} />
                <td colSpan={4} style={{ ...c(), borderRight: 'none' }} />
              </tr>
              <tr>
                <td style={{ ...lbl(), borderLeft: 'none', borderBottom: 'none' }}>메모</td>
                <td colSpan={7} style={{ ...c({ fontSize: '12px' }), borderRight: 'none', borderBottom: 'none' }}>{stub.comment || ''}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

function formatStubDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const parts = dateStr.replace(/-/g, '.').split('.')
  if (parts.length >= 3) {
    return `${parts[0]}. ${parseInt(parts[1])}. ${parseInt(parts[2])}.`
  }
  return dateStr
}
