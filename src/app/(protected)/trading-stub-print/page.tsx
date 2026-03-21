'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TradingStubMaster, TradingStubDetail, Company, Customer } from '@/lib/types'

type DetailWithCategory = TradingStubDetail & { category_name?: string }

export default function TradingStubPrintPage() {
  const { user, isSeller } = useAuth()
  const [stubs, setStubs] = useState<(TradingStubMaster & { customer_name?: string })[]>([])
  const [selectedStub, setSelectedStub] = useState<(TradingStubMaster & { customer_name?: string }) | null>(null)
  const [details, setDetails] = useState<DetailWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  // 공급자/구매자 회사 정보
  const [sellerCompany, setSellerCompany] = useState<Company | null>(null)
  const [customerCompany, setCustomerCompany] = useState<Customer | null>(null)

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

  // 공급자(판매회사) 정보 조회
  const fetchSellerCompany = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/companies/${user.companyId}`)
      const data = await res.json()
      if (data && !data.error) setSellerCompany(data)
    } catch (e) {
      console.error('공급자 정보 조회 실패:', e)
    }
  }

  // 구매자(거래처) 정보 조회
  const fetchCustomerCompany = async (sellerId: string, customerId: string) => {
    try {
      const res = await fetch(`/api/customers?seller_id=${sellerId}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        const cust = data.find((c: Customer) => c.customer_id === customerId)
        if (cust) setCustomerCompany(cust)
      }
    } catch (e) {
      console.error('구매자 정보 조회 실패:', e)
    }
  }

  useEffect(() => {
    fetchStubs()
    fetchSellerCompany()
  }, [user])

  const fetchDetails = async (tsId: string) => {
    const res = await fetch(`/api/trading-stubs/${tsId}/details`)
    const data = await res.json()
    if (Array.isArray(data)) setDetails(data)
  }

  const handleSelectStub = (stub: TradingStubMaster & { customer_name?: string }) => {
    setSelectedStub(stub)
    fetchDetails(stub.ts_id)
    if (stub.seller_id && stub.customer_id) {
      fetchCustomerCompany(stub.seller_id, stub.customer_id)
    }
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR')
  }

  // 날짜 포맷: "2026. 3. 20."
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    // 'YYYY.MM.DD' -> 'YYYY. M. D.'
    const parts = dateStr.replace(/-/g, '.').split('.')
    if (parts.length >= 3) {
      return `${parts[0]}. ${parseInt(parts[1])}. ${parseInt(parts[2])}.`
    }
    return dateStr
  }

  // 사업자번호 포맷팅 (000-00-00000)
  const formatBusinessID = (businessID: string | null) => {
    if (!businessID) return ''
    const numbers = businessID.replace(/\D/g, '')
    if (numbers.length === 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`
    }
    return businessID
  }

  if (!user) return null

  // 빈 행 수 계산 (최소 8행)
  const emptyRowCount = Math.max(0, 8 - details.length)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-2xl font-bold">거래명세표</h2>
        <Button variant="outline" onClick={() => window.print()}>인쇄</Button>
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
                    <td className="p-2">{s.customer_name || s.customer_id}</td>
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

      {/* ===== 인쇄 영역: 거래명세표 (2025 스타일) ===== */}
      {selectedStub && (
        <div className="print-area bg-white p-4">
          <div className="border-2 border-black">
            {/* 헤더 섹션 */}
            <div className="border-b-2 border-black">
              {/* 첫 번째 행 - 거래명세표와 일자 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-8 bg-gray-50 p-2 border-r border-black flex items-center justify-center">
                  <div className="text-xl font-bold text-black" style={{ letterSpacing: '1em' }}>거 래 명 세 표</div>
                </div>
                <div className="col-span-2 bg-gray-50 p-2 border-r border-black flex items-center justify-center">
                  <div className="text-xs font-bold text-black">일자</div>
                </div>
                <div className="col-span-2 bg-white p-2 flex items-center justify-center">
                  <div className="text-xs font-bold">{formatDate(selectedStub.issue_date)}</div>
                </div>
              </div>

              {/* 회사 정보 섹션 */}
              <div className="grid grid-cols-2 border-b border-black">
                {/* 공급자 정보 */}
                <div className="border-r border-black">
                  <div className="bg-gray-50 p-1 text-center border-b border-black">
                    <div className="text-sm font-bold">공급자</div>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] text-xs">
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">사업자번호</div>
                    <div className="p-1 text-center border-b border-black">{formatBusinessID(sellerCompany?.business_id || null)}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">상호</div>
                    <div className="p-1 text-center border-b border-black">{sellerCompany?.company_name || user.companyName}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">성명</div>
                    <div className="p-1 text-center border-b border-black">{sellerCompany?.owner_name || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">주소</div>
                    <div className="p-1 text-left border-b border-black text-xs">{sellerCompany?.address || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">업태</div>
                    <div className="p-1 text-center border-b border-black">{sellerCompany?.uptae || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">종목</div>
                    <div className="p-1 text-center border-b border-black">{sellerCompany?.jongmok || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold whitespace-nowrap">전화</div>
                    <div className="p-1 text-center">{sellerCompany?.phone_number || ''}</div>
                  </div>
                </div>

                {/* 공급받는자 정보 */}
                <div>
                  <div className="bg-gray-50 p-1 text-center border-b border-black">
                    <div className="text-sm font-bold">공급받는자</div>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] text-xs">
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">사업자번호</div>
                    <div className="p-1 text-center border-b border-black">{formatBusinessID(customerCompany?.business_id || null)}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">상호</div>
                    <div className="p-1 text-center border-b border-black">{customerCompany?.customer_name || selectedStub.customer_name || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">성명</div>
                    <div className="p-1 text-center border-b border-black">{customerCompany?.owner_name || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">주소</div>
                    <div className="p-1 text-left border-b border-black text-xs">{customerCompany?.address || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">업태</div>
                    <div className="p-1 text-center border-b border-black">{customerCompany?.uptae || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black border-b border-black font-bold whitespace-nowrap">종목</div>
                    <div className="p-1 text-center border-b border-black">{customerCompany?.jongmok || ''}</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold whitespace-nowrap">전화</div>
                    <div className="p-1 text-center">{customerCompany?.phone_number || ''}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 거래 상품 목록 테이블 */}
            <div className="border-b border-black">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-black p-1 text-center font-bold" style={{ width: '40px' }}>No.</th>
                    <th className="border border-black p-1 text-center font-bold">카테고리</th>
                    <th className="border border-black p-1 text-center font-bold">품목</th>
                    <th className="border border-black p-1 text-center font-bold">규격</th>
                    <th className="border border-black p-1 text-center font-bold" style={{ width: '70px' }}>단가</th>
                    <th className="border border-black p-1 text-center font-bold" style={{ width: '70px' }}>수량</th>
                    <th className="border border-black p-1 text-center font-bold" style={{ width: '90px' }}>공급가액</th>
                    <th className="border border-black p-1 text-center font-bold" style={{ width: '50px' }}>세액</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map(d => (
                    <tr key={d.sequence}>
                      <td className="border border-black p-1 text-center">{d.sequence}</td>
                      <td className="border border-black p-1">{d.category_name || d.category_id || ''}</td>
                      <td className="border border-black p-1">{d.description}</td>
                      <td className="border border-black p-1">{d.standard}</td>
                      <td className="border border-black p-1 text-right">{Number(d.unit_price).toFixed(1)}</td>
                      <td className="border border-black p-1 text-right">{formatPrice(Number(d.quantity))}</td>
                      <td className="border border-black p-1 text-right font-bold">{formatPrice(Number(d.amount))}</td>
                      <td className="border border-black p-1 text-right">{Number(d.vat)}</td>
                    </tr>
                  ))}
                  {/* 빈 행 */}
                  {Array.from({ length: emptyRowCount }, (_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="border border-black p-1 h-6">&nbsp;</td>
                      <td className="border border-black p-1">&nbsp;</td>
                      <td className="border border-black p-1">&nbsp;</td>
                      <td className="border border-black p-1">&nbsp;</td>
                      <td className="border border-black p-1">&nbsp;</td>
                      <td className="border border-black p-1">&nbsp;</td>
                      <td className="border border-black p-1">&nbsp;</td>
                      <td className="border border-black p-1">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 합계 섹션 */}
            <div className="grid grid-cols-12">
              {/* 좌측 정보 */}
              <div className="col-span-6 border-r border-black">
                <div className="grid grid-rows-3 text-xs">
                  <div className="border-b border-black grid grid-cols-4">
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold">계</div>
                    <div className="p-1 text-center border-r border-black">{selectedStub.item_count}</div>
                    <div className="p-1 text-center border-r border-black"></div>
                    <div className="p-1 text-center"></div>
                  </div>
                  <div className="border-b border-black grid grid-cols-4">
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold">현금</div>
                    <div className="p-1 text-center border-r border-black"></div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold">수표</div>
                    <div className="p-1 text-center"></div>
                  </div>
                  <div className="grid grid-cols-4">
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold">어음</div>
                    <div className="p-1 text-center border-r border-black"></div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold">외상</div>
                    <div className="p-1 text-center"></div>
                  </div>
                </div>
              </div>

              {/* 우측 합계 */}
              <div className="col-span-6">
                <div className="grid grid-rows-3 h-full text-xs">
                  <div className="border-b border-black grid grid-cols-3">
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold">공급가액</div>
                    <div className="bg-gray-50 p-1 text-center border-r border-black font-bold">세액</div>
                    <div className="bg-gray-50 p-1 text-center font-bold">합계</div>
                  </div>
                  <div className="border-b border-black grid grid-cols-3">
                    <div className="p-1 text-center border-r border-black font-bold">{formatPrice(Number(selectedStub.sum_amount))}</div>
                    <div className="p-1 text-center border-r border-black font-bold">{formatPrice(Number(selectedStub.sum_vat))}</div>
                    <div className="p-1 text-center font-bold" style={{ color: '#4400cc' }}>{formatPrice(Number(selectedStub.total_amount))}</div>
                  </div>
                  <div className="grid grid-cols-3">
                    <div className="p-1 text-center border-r border-black"></div>
                    <div className="p-1 text-center border-r border-black"></div>
                    <div className="p-1 text-center"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="mt-2 text-center text-gray-500 text-xs">
            <p>본 명세표는 {formatDate(today)}에 조회되었습니다.</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }

          @page {
            margin: 0.5cm;
            size: A4;
          }

          .bg-gray-50 {
            background-color: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .border-black {
            border-color: #000 !important;
          }
        }
      `}</style>
    </div>
  )
}
