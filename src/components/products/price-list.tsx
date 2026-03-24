'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

const GRADE_LABELS = [
  { label: '3.8급', field: 'unit_price01' },
  { label: '3.9급', field: 'unit_price02' },
  { label: '4.0급', field: 'unit_price03' },
  { label: '4.1급', field: 'unit_price04' },
  { label: '4.2급', field: 'unit_price05' },
  { label: '4.3급', field: 'unit_price06' },
  { label: '4.4급', field: 'unit_price07' },
  { label: '4.5급', field: 'unit_price08' },
  { label: '4.6급', field: 'unit_price09' },
  { label: '4.7급', field: 'unit_price10' },
  { label: '4.8급', field: 'unit_price11' },
  { label: '4.9급', field: 'unit_price12' },
  { label: '5.0급', field: 'unit_price13' },
  { label: '5.1급', field: 'unit_price14' },
  { label: '5.2급', field: 'unit_price15' },
  { label: '5.3급', field: 'unit_price16' },
  { label: '5.4급', field: 'unit_price17' },
  { label: '5.5급', field: 'unit_price18' },
  { label: '5.6급', field: 'unit_price19' },
  { label: '5.7급', field: 'unit_price20' },
]

const thStyle: React.CSSProperties = {
  padding: '2px 4px', border: '1px solid #ccc', textAlign: 'left',
  whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '11px', backgroundColor: '#f0f0f0',
}
const tdStyle: React.CSSProperties = {
  padding: '1px 4px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', fontSize: '11px',
}

export function PriceList() {
  const { user } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<any | null>(null)
  const [editPrices, setEditPrices] = useState<Record<string, string>>({})
  const [editAttrs, setEditAttrs] = useState({ attribute01: '', attribute02: '', attribute03: '', attribute04: '', attribute05: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProducts = () => {
    if (!user) return
    const params = new URLSearchParams({ seller_id: user.companyId })
    setLoading(true)
    fetch(`/api/products?${params}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setProducts(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProducts() }, [user])

  const openEditModal = (p: any) => {
    setEditProduct(p)
    const prices: Record<string, string> = {}
    GRADE_LABELS.forEach(g => {
      prices[g.field] = p[g.field] != null ? String(p[g.field]) : ''
    })
    setEditPrices(prices)
    setEditAttrs({
      attribute01: p.attribute01 || '',
      attribute02: p.attribute02 || '',
      attribute03: p.attribute03 || '',
      attribute04: p.attribute04 || '',
      attribute05: p.attribute05 || '',
    })
  }

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
      }
      GRADE_LABELS.forEach(g => {
        updateData[g.field] = editPrices[g.field] ? parseFloat(editPrices[g.field]) : null
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

    const rows = products.map((p: any) => {
      const row: Record<string, any> = {
        'ID': p.product_id,
        '품명': p.attribute01 || '',
        '색깔': p.attribute02 || '',
        '두께': p.attribute03 || '',
        '사이즈': p.attribute04 || '',
        '마대량': p.attribute05 ? Number(p.attribute05) : '',
      }
      GRADE_LABELS.forEach(g => {
        const val = p[g.field]
        row[g.label] = val != null && Number(val) !== 0 ? Number(val) : ''
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
      ...GRADE_LABELS.map(() => ({ wch: 8 })),
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '단가표')

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    XLSX.writeFile(wb, `단가표_${today}.xlsx`)
    toast.success('엑셀 다운로드 완료')
  }

  // 엑셀 업로드
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
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
        if (row['품명'] !== undefined) updateData.attribute01 = String(row['품명'] || '')
        if (row['색깔'] !== undefined) updateData.attribute02 = String(row['색깔'] || '')
        if (row['두께'] !== undefined) updateData.attribute03 = String(row['두께'] || '')
        if (row['사이즈'] !== undefined) updateData.attribute04 = String(row['사이즈'] || '')
        if (row['마대량'] !== undefined) updateData.attribute05 = String(row['마대량'] || '')

        GRADE_LABELS.forEach(g => {
          const val = row[g.label]
          if (val !== undefined && val !== '') {
            updateData[g.field] = parseFloat(String(val)) || null
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
    } catch {
      toast.error('엑셀 파일 읽기 실패')
    } finally {
      setUploading(false)
    }
  }

  const inputStyle: React.CSSProperties = { padding: '3px 6px', fontSize: '12px', border: '1px solid #ccc', width: '100%', textAlign: 'right' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '5px 0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>기성품 단가표</h3>
        <div style={{ display: 'flex', gap: '6px' }}>
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
      </div>
      <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', overflowX: 'auto', border: '1px solid silver' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '1400px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>카테고리</th>
              <th style={thStyle}>품명</th>
              <th style={thStyle}>색깔</th>
              <th style={thStyle}>두께</th>
              <th style={thStyle}>사이즈</th>
              <th style={thStyle}>마대량</th>
              {GRADE_LABELS.map(g => (
                <th key={g.label} style={{ ...thStyle, textAlign: 'right', minWidth: '42px' }}>{g.label}</th>
              ))}
              <th style={thStyle}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8 + GRADE_LABELS.length} style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8 + GRADE_LABELS.length} style={{ padding: '20px', textAlign: 'center' }}>등록된 상품이 없습니다.</td></tr>
            ) : products.map((p: any) => (
              <tr key={p.product_id} className="hover:bg-blue-50" style={{ borderBottom: '1px solid #e5e5e5' }}>
                <td style={tdStyle}>{p.product_id}</td>
                <td style={tdStyle}>{p.categories?.category_m || ''}</td>
                <td style={tdStyle}>{p.attribute01}</td>
                <td style={tdStyle}>{p.attribute02}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{p.attribute03}</td>
                <td style={tdStyle}>{p.attribute04}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{p.attribute05 ? Number(p.attribute05).toLocaleString() : ''}</td>
                {GRADE_LABELS.map(g => (
                  <td key={g.field} style={{ ...tdStyle, textAlign: 'right' }}>{p[g.field] != null ? Number(p[g.field]).toFixed(1) : ''}</td>
                ))}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span
                    onClick={() => openEditModal(p)}
                    style={{ color: 'blue', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                  >
                    관리
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 단가 관리 모달 */}
      {editProduct && (
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
                </div>
              </div>

              {/* 등급별 단가 */}
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>등급별 단가 (3.8급 ~ 5.7급)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {GRADE_LABELS.map(g => (
                  <div key={g.field} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ ...labelStyle, minWidth: '40px' }}>{g.label}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editPrices[g.field] || ''}
                      onChange={e => setEditPrices({ ...editPrices, [g.field]: e.target.value })}
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
