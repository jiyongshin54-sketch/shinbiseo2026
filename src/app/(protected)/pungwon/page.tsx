'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { SELLER_COMPANIES, PRICE_GRADES } from '@/lib/constants'
import type { Product } from '@/lib/types'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

const PUNGWON_ID = SELLER_COMPANIES.PUNGWON

// 판매회사 관리용: 전체 등급 컬럼
const GRADE_COLUMNS = PRICE_GRADES.map((grade, idx) => ({
  grade,
  field: `unit_price${String(idx + 1).padStart(2, '0')}` as keyof Product,
}))

interface ProductWithCategory extends Product {
  categories?: { category_l: string | null; category_m: string | null; category_s: string | null }
  // 구매회사용 필드 (API가 buyer_company_id 전달 시 반환)
  unit_price_level1?: number
  unit_price_level2?: number
  customer_id?: string
  customer_name?: string
  customer_level1?: string
  customer_level2?: string
  madae_criteria?: number
}

export default function PungwonPage() {
  const { user, isSeller, isBuyer, isOwner, isAdmin } = useAuth()

  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')

  // 판매회사 대표/관리자만 관리 가능
  const canManage = isSeller && (isOwner || isAdmin)

  // 엑셀 업로드용 ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // 관리 모달 상태
  const [editProduct, setEditProduct] = useState<any | null>(null)
  const [editPrices, setEditPrices] = useState<Record<string, string>>({})
  const [editAttrs, setEditAttrs] = useState({ attribute01: '', attribute02: '', attribute03: '', attribute04: '', attribute05: '', status: '판매중' })
  const [saving, setSaving] = useState(false)

  const fetchProducts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ seller_id: PUNGWON_ID })

      if (canManage) {
        // 판매회사 대표/관리자 → 전체 등급 단가표
        params.set('price_list', 'true')
      } else {
        // 구매회사 → 해당 구매회사 등급에 맞는 일반단가/마대단가만
        params.set('buyer_company_id', user.companyId)
      }

      if (searchKeyword) params.set('search', searchKeyword)
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } catch {
      toast.error('상품 조회 실패')
    } finally {
      setLoading(false)
    }
  }, [user, canManage, searchKeyword])

  useEffect(() => {
    if (user) fetchProducts()
  }, [user])

  const formatPrice = (val: unknown): string => {
    const n = Number(val)
    if (!n || n === 0) return ''
    // 항상 소수점 첫째자리까지 표시 (예: 3.8, 12.0)
    return n.toFixed(1)
  }

  const formatMadae = (val: unknown): string => {
    const n = Number(val)
    if (!n || n === 0) return ''
    return n.toLocaleString()
  }

  // 관리 모달 열기
  const openEditModal = (p: any) => {
    setEditProduct(p)
    const prices: Record<string, string> = {}
    GRADE_COLUMNS.forEach(g => {
      prices[g.field as string] = p[g.field] != null ? String(p[g.field]) : ''
    })
    setEditPrices(prices)
    setEditAttrs({
      attribute01: p.attribute01 || '',
      attribute02: p.attribute02 || '',
      attribute03: p.attribute03 || '',
      attribute04: p.attribute04 || '',
      attribute05: p.attribute05 || '',
      status: p.status || '판매중',
    })
  }

  // 저장
  const handleSave = async () => {
    if (!editProduct || !user) return
    setSaving(true)
    try {
      const updateData: Record<string, any> = {
        attribute01: editAttrs.attribute01,
        attribute02: editAttrs.attribute02,
        attribute03: editAttrs.attribute03,
        attribute04: editAttrs.attribute04,
        attribute05: editAttrs.attribute05,
        status: editAttrs.status,
      }
      GRADE_COLUMNS.forEach(g => {
        const key = g.field as string
        updateData[key] = editPrices[key] ? parseFloat(editPrices[key]) : null
      })

      const res = await fetch(`/api/products/${user.companyId}/${editProduct.product_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success('단가 수정 완료')
      setEditProduct(null)
      fetchProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    } finally {
      setSaving(false)
    }
  }

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    if (products.length === 0) {
      toast.error('다운로드할 데이터가 없습니다')
      return
    }

    const rows = products.map(p => {
      const row: Record<string, any> = {
        'ID': p.product_id,
        '품명': p.attribute01 || '',
        '색깔': p.attribute02 || '',
        '두께': p.attribute03 || '',
        '사이즈': p.attribute04 || '',
        '마대량': p.attribute05 ? Number(p.attribute05) : '',
      }
      GRADE_COLUMNS.forEach(gc => {
        const val = p[gc.field]
        row[gc.grade] = val != null && Number(val) !== 0 ? Number(val) : ''
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 8 },   // ID
      { wch: 12 },  // 품명
      { wch: 8 },   // 색깔
      { wch: 8 },   // 두께
      { wch: 12 },  // 사이즈
      { wch: 10 },  // 마대량
      ...GRADE_COLUMNS.map(() => ({ wch: 8 })),
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '단가표')

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    XLSX.writeFile(wb, `풍원_단가표_${today}.xlsx`)
    toast.success('엑셀 다운로드 완료')
  }

  // 엑셀 업로드
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // input 초기화 (같은 파일 재업로드 가능하도록)
    e.target.value = ''

    setUploading(true)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

      if (rows.length === 0) {
        toast.error('엑셀 파일에 데이터가 없습니다')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const row of rows) {
        const productId = String(row['ID'] || '').trim()
        if (!productId) { errorCount++; continue }

        const updateData: Record<string, any> = {}

        // 속성 업데이트
        if (row['품명'] !== undefined) updateData.attribute01 = String(row['품명'] || '')
        if (row['색깔'] !== undefined) updateData.attribute02 = String(row['색깔'] || '')
        if (row['두께'] !== undefined) updateData.attribute03 = String(row['두께'] || '')
        if (row['사이즈'] !== undefined) updateData.attribute04 = String(row['사이즈'] || '')
        if (row['마대량'] !== undefined) updateData.attribute05 = String(row['마대량'] || '')

        // 등급별 단가 업데이트
        GRADE_COLUMNS.forEach(gc => {
          const val = row[gc.grade]
          if (val !== undefined && val !== '') {
            updateData[gc.field as string] = parseFloat(String(val)) || null
          }
        })

        try {
          const res = await fetch(`/api/products/${user.companyId}/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          })
          const result = await res.json()
          if (result.error) { errorCount++; continue }
          successCount++
        } catch {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount}건 수정 완료${errorCount > 0 ? ` (${errorCount}건 실패)` : ''}`)
        fetchProducts()
      } else {
        toast.error(`업로드 실패: ${errorCount}건 오류`)
      }
    } catch (err) {
      toast.error('엑셀 파일 읽기 실패')
    } finally {
      setUploading(false)
    }
  }

  if (!user) return null

  const inputStyle: React.CSSProperties = { padding: '3px 6px', fontSize: '12px', border: '1px solid #ccc', width: '100%', textAlign: 'right' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap' }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* 헤더 */}
      <div style={{ backgroundColor: '#003366', color: 'white', padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>풍원비닐포장 단가표</span>
        <span style={{ fontSize: '12px' }}>{user.userName}님 환영합니다</span>
      </div>

      {/* 검색바 */}
      <div style={{ backgroundColor: '#e8eef4', padding: '5px 8px', borderBottom: '1px solid #c0c8d0', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>검색:</span>
        <input
          type="text"
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchProducts()}
          placeholder="품명, 색깔, 사이즈로 검색 (엔터)"
          style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid #ccc', width: '300px' }}
        />
        <button
          onClick={fetchProducts}
          disabled={loading}
          style={{ padding: '4px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', border: 'none' }}
        >
          조회
        </button>
        <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
          총 {products.length}건
        </span>
        {/* 판매회사 관리자: 엑셀 다운로드/업로드 */}
        {canManage && (
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            <button
              onClick={handleExcelDownload}
              disabled={products.length === 0}
              style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#16a34a', color: 'white', border: 'none', fontWeight: 'bold' }}
            >
              엑셀 다운로드
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#ea580c', color: 'white', border: 'none', fontWeight: 'bold' }}
            >
              {uploading ? '업로드 중...' : '엑셀 업로드'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {/* 단가표 테이블 */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0, border: '1px solid silver' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ccffcc', position: 'sticky', top: 0, zIndex: 1 }}>
              {canManage && <th style={thStyle}>ID</th>}
              <th style={thStyle}>카테고리</th>
              <th style={thStyle}>품명</th>
              <th style={thStyle}>색깔</th>
              <th style={thStyle}>두께</th>
              <th style={thStyle}>사이즈</th>
              <th style={thStyle}>마대량</th>
              {canManage && <th style={{ ...thStyle, textAlign: 'center' }}>상태</th>}
              {canManage ? (
                // 판매회사: 전체 등급 컬럼
                GRADE_COLUMNS.map(gc => (
                  <th key={gc.grade} style={{ ...thStyle, minWidth: '48px', textAlign: 'center', fontSize: '10px' }}>
                    {gc.grade}
                  </th>
                ))
              ) : (
                // 구매회사: 일반단가 / 마대단가만
                <>
                  <th style={{ ...thStyle, minWidth: '70px', textAlign: 'center' }}>일반단가</th>
                  <th style={{ ...thStyle, minWidth: '70px', textAlign: 'center' }}>마대단가</th>
                </>
              )}
              {canManage && <th style={thStyle}>관리</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canManage ? 9 + GRADE_COLUMNS.length : 9} style={{ padding: '30px', textAlign: 'center' }}>조회 중...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={canManage ? 9 + GRADE_COLUMNS.length : 9} style={{ padding: '30px', textAlign: 'center' }}>상품이 없습니다</td></tr>
            ) : products.map(p => (
              <tr key={p.product_id} className="hover:bg-yellow-50">
                {canManage && <td style={tdStyle}>{p.product_id}</td>}
                <td style={tdStyle}>{p.categories?.category_s || p.categories?.category_m || ''}</td>
                <td style={tdStyle}>{p.attribute01}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{p.attribute02}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{p.attribute03}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{p.attribute04}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{formatMadae(p.attribute05)}</td>
                {canManage && (
                  <td style={{ ...tdStyle, textAlign: 'center', fontSize: '10px', color: p.status === '판매중' ? '#16a34a' : p.status === '일시품절' ? '#ea580c' : '#999' }}>
                    {p.status || '판매중'}
                  </td>
                )}
                {canManage ? (
                  // 판매회사: 전체 등급 단가
                  GRADE_COLUMNS.map(gc => (
                    <td key={gc.grade} style={{ ...tdStyle, textAlign: 'right', fontSize: '10px' }}>
                      {formatPrice(p[gc.field])}
                    </td>
                  ))
                ) : (
                  // 구매회사: 일반단가 / 마대단가
                  <>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                      {formatPrice(p.unit_price_level1)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                      {formatPrice(p.unit_price_level2)}
                    </td>
                  </>
                )}
                {canManage && (
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span
                      onClick={() => openEditModal(p)}
                      style={{ color: 'blue', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                    >
                      관리
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 단가 관리 모달 (판매회사 대표/관리자만) */}
      {canManage && editProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', width: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ backgroundColor: '#003366', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                단가 관리 - {editProduct.product_id} {editProduct.attribute01}
              </span>
              <button onClick={() => setEditProduct(null)} style={{ color: 'white', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {/* 기본 정보 */}
              <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>상품 기본 정보</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={labelStyle}>품명:</span>
                    <input value={editAttrs.attribute01} onChange={e => setEditAttrs({ ...editAttrs, attribute01: e.target.value })} style={{ ...inputStyle, textAlign: 'left' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={labelStyle}>색깔:</span>
                    <input value={editAttrs.attribute02} onChange={e => setEditAttrs({ ...editAttrs, attribute02: e.target.value })} style={{ ...inputStyle, textAlign: 'left' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={labelStyle}>두께:</span>
                    <input value={editAttrs.attribute03} onChange={e => setEditAttrs({ ...editAttrs, attribute03: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={labelStyle}>사이즈:</span>
                    <input value={editAttrs.attribute04} onChange={e => setEditAttrs({ ...editAttrs, attribute04: e.target.value })} style={{ ...inputStyle, textAlign: 'left' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={labelStyle}>마대량:</span>
                    <input value={editAttrs.attribute05} onChange={e => setEditAttrs({ ...editAttrs, attribute05: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={labelStyle}>상태:</span>
                    <select value={editAttrs.status} onChange={e => setEditAttrs({ ...editAttrs, status: e.target.value })} style={{ ...inputStyle, textAlign: 'left' }}>
                      <option value="판매중">판매중</option>
                      <option value="일시품절">일시품절</option>
                      <option value="판매중지">판매중지</option>
                      <option value="삭제">삭제</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 등급별 단가 */}
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>등급별 단가 (3.8급 ~ 5.7급)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {GRADE_COLUMNS.map(g => (
                  <div key={g.field as string} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ ...labelStyle, minWidth: '40px' }}>{g.grade}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editPrices[g.field as string] || ''}
                      onChange={e => setEditPrices({ ...editPrices, [g.field as string]: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px', backgroundColor: '#f5f5f5', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setEditProduct(null)} style={{ padding: '5px 20px', fontSize: '13px', cursor: 'pointer', border: '1px solid #ccc', backgroundColor: 'white' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '5px 20px', fontSize: '13px', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', border: 'none', fontWeight: 'bold' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '3px 4px', border: '1px solid silver', textAlign: 'left',
  whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '11px',
}
const tdStyle: React.CSSProperties = {
  padding: '2px 4px', border: '1px solid silver', whiteSpace: 'nowrap', fontSize: '11px',
}
