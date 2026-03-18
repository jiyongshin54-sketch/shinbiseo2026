'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BillingItem {
  customer_id: string
  customer_name: string
  payment: string
  total: number
}

export default function BillingPage() {
  const { user } = useAuth()
  const [receivables, setReceivables] = useState<BillingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetch(`/api/billing?seller_id=${user.companyId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setReceivables(data) })
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return null

  const dailyPayments = receivables.filter(r => r.payment === '일결제')
  const monthlyPayments = receivables.filter(r => r.payment === '월결제')
  const totalReceivable = receivables.reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">청구서 / 미수금</h2>
        <Button variant="outline" onClick={() => window.print()} className="no-print">인쇄</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">전체 미수금</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalReceivable.toLocaleString()}원</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">일결제</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{dailyPayments.reduce((s, r) => s + r.total, 0).toLocaleString()}원</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">월결제</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{monthlyPayments.reduce((s, r) => s + r.total, 0).toLocaleString()}원</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">거래처별 미수금</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-left">거래처명</th>
                <th className="p-2 text-center">결제조건</th>
                <th className="p-2 text-right">미수금</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="p-4 text-center">로딩 중...</td></tr>
              ) : receivables.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">미수금이 없습니다.</td></tr>
              ) : (
                receivables.map((r) => (
                  <tr key={r.customer_id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{r.customer_name}</td>
                    <td className="p-2 text-center"><Badge variant="outline" className="text-xs">{r.payment || '-'}</Badge></td>
                    <td className="p-2 text-right font-medium">{r.total.toLocaleString()}원</td>
                  </tr>
                ))
              )}
            </tbody>
            {receivables.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="p-2">합계</td>
                  <td></td>
                  <td className="p-2 text-right">{totalReceivable.toLocaleString()}원</td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
