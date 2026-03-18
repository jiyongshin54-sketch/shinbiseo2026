'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TradingStubMaster, TradingStubDetail } from '@/lib/types'

export default function TradingStubPrintPage() {
  const { user, isSeller } = useAuth()
  const [stubs, setStubs] = useState<(TradingStubMaster & { customers?: { customer_name: string } })[]>([])
  const [selectedStub, setSelectedStub] = useState<TradingStubMaster | null>(null)
  const [details, setDetails] = useState<TradingStubDetail[]>([])
  const [loading, setLoading] = useState(true)

  // 기간 필터
  const now = new Date()
  const firstDay = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.01`
  const today = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  const [dateFrom, setDateFrom] = useState(firstDay)
  const [dateTo, setDateTo] = useState(today)

  const fetchStubs = async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        seller_id: user.companyId,
        date_from: dateFrom,
        date_to: dateTo,
      })
      const res = await fetch(`/api/trading-stubs?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setStubs(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStubs() }, [user])

  const fetchDetails = async (tsId: string) => {
    const res = await fetch(`/api/trading-stubs/${tsId}/details`)
    const data = await res.json()
    if (Array.isArray(data)) setDetails(data)
  }

  const handleSelectStub = (stub: TradingStubMaster) => {
    setSelectedStub(stub)
    fetchDetails(stub.ts_id)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">거래명세표</h2>
        <Button variant="outline" onClick={() => window.print()} className="no-print">인쇄</Button>
      </div>

      {/* 검색 필터 */}
      <div className="flex items-end gap-3 flex-wrap no-print">
        <div className="space-y-1">
          <Label className="text-xs">시작일</Label>
          <Input className="w-[130px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">종료일</Label>
          <Input className="w-[130px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Button onClick={fetchStubs}>조회</Button>
      </div>

      {/* 거래명세표 목록 */}
      <Card className="no-print">
        <CardHeader><CardTitle className="text-base">거래명세표 목록</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-left">발행일</th>
                <th className="p-2 text-left">거래처</th>
                <th className="p-2 text-right">품목수</th>
                <th className="p-2 text-right">공급가</th>
                <th className="p-2 text-right">부가세</th>
                <th className="p-2 text-right">합계</th>
                <th className="p-2 text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center">로딩 중...</td></tr>
              ) : stubs.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">거래명세표가 없습니다.</td></tr>
              ) : (
                stubs.map(s => (
                  <tr
                    key={s.ts_id}
                    className={`border-b cursor-pointer hover:bg-gray-50 ${selectedStub?.ts_id === s.ts_id ? 'bg-blue-50' : ''}`}
                    onClick={() => handleSelectStub(s)}
                  >
                    <td className="p-2">{s.issue_date}</td>
                    <td className="p-2">{s.customers?.customer_name || s.customer_id}</td>
                    <td className="p-2 text-right">{s.item_count}</td>
                    <td className="p-2 text-right">{Number(s.sum_amount).toLocaleString()}</td>
                    <td className="p-2 text-right">{Number(s.sum_vat).toLocaleString()}</td>
                    <td className="p-2 text-right font-medium">{Number(s.total_amount).toLocaleString()}</td>
                    <td className="p-2 text-center"><Badge variant="outline" className="text-xs">{s.status}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 인쇄 영역: 거래명세표 상세 */}
      {selectedStub && (
        <Card className="print-area">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-center mb-6 border-b-2 pb-2">거 래 명 세 표</h3>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p><strong>발행일:</strong> {selectedStub.issue_date}</p>
                <p><strong>거래처:</strong> {stubs.find(s => s.ts_id === selectedStub.ts_id)?.customers?.customer_name || selectedStub.customer_id}</p>
              </div>
              <div className="text-right">
                <p><strong>결제방식:</strong> {selectedStub.payment_method || '-'}</p>
                <p><strong>비고:</strong> {selectedStub.comment || '-'}</p>
              </div>
            </div>

            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-center">순번</th>
                  <th className="border p-2 text-left">품명</th>
                  <th className="border p-2 text-left">규격</th>
                  <th className="border p-2 text-right">단가</th>
                  <th className="border p-2 text-right">수량</th>
                  <th className="border p-2 text-right">금액</th>
                  <th className="border p-2 text-right">부가세</th>
                </tr>
              </thead>
              <tbody>
                {details.map(d => (
                  <tr key={d.sequence}>
                    <td className="border p-2 text-center">{d.sequence}</td>
                    <td className="border p-2">{d.description}</td>
                    <td className="border p-2">{d.standard}</td>
                    <td className="border p-2 text-right">{Number(d.unit_price).toLocaleString()}</td>
                    <td className="border p-2 text-right">{Number(d.quantity).toLocaleString()}</td>
                    <td className="border p-2 text-right">{Number(d.amount).toLocaleString()}</td>
                    <td className="border p-2 text-right">{Number(d.vat).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-gray-50">
                  <td colSpan={5} className="border p-2 text-right">합계</td>
                  <td className="border p-2 text-right">{Number(selectedStub.sum_amount).toLocaleString()}</td>
                  <td className="border p-2 text-right">{Number(selectedStub.sum_vat).toLocaleString()}</td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={5} className="border p-2 text-right">총 합계</td>
                  <td colSpan={2} className="border p-2 text-right text-lg">
                    {Number(selectedStub.total_amount).toLocaleString()}원
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
