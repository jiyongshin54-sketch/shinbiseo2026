'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { PRICE_GRADES } from '@/lib/constants'
import { toast } from 'sonner'

interface ProductRow {
  seller_id: string
  product_id: string
  category_id: string | null
  attribute01: string | null
  attribute02: string | null
  attribute03: string | null
  attribute04: string | null
  attribute05: string | null
  stock: number | null
  [key: string]: unknown
}

const GRADE_FIELDS = PRICE_GRADES.map((g, i) => ({
  grade: g,
  field: `unit_price${String(i + 1).padStart(2, '0')}`,
}))

export default function MyCompanyAdminPage() {
  const { user, isSeller, isOwner, isAdmin } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  // 폼
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({
    attribute01: '', attribute02: '', attribute03: '', attribute04: '', attribute05: '',
    ...Object.fromEntries(GRADE_FIELDS.map(g => [g.field, ''])),
  })
  const [saving, setSaving] = useState(false)

  const canManage = isSeller && (isOwner || isAdmin)

  const fetchProducts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/products?seller_id=${user.companyId}`)
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const openAddForm = () => {
    setEditingProductId(null)
    setForm({
      attribute01: '', attribute02: '', attribute03: '', attribute04: '', attribute05: '',
      ...Object.fromEntries(GRADE_FIELDS.map(g => [g.field, ''])),
    } as Record<string, string>)
    setFormOpen(true)
  }

  const openEditForm = (p: ProductRow) => {
    setEditingProductId(p.product_id)
    setForm({
      attribute01: p.attribute01 || '',
      attribute02: p.attribute02 || '',
      attribute03: p.attribute03 || '',
      attribute04: p.attribute04 || '',
      attribute05: p.attribute05 || '',
      ...Object.fromEntries(GRADE_FIELDS.map(g => [g.field, String(p[g.field] || '')])),
    })
    setFormOpen(true)
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!user) return
    if (!form.attribute01) { toast.error('품명을 입력하세요.'); return }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        attribute01: form.attribute01,
        attribute02: form.attribute02,
        attribute03: form.attribute03,
        attribute04: form.attribute04,
        attribute05: form.attribute05,
      }
      for (const g of GRADE_FIELDS) {
        payload[g.field] = parseFloat(form[g.field]) || 0
      }

      let res: Response
      if (editingProductId) {
        res = await fetch(`/api/products/${user.companyId}/${editingProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seller_id: user.companyId, ...payload }),
        })
      }

      const result = await res.json()
      if (result.error) throw new Error(result.error)

      toast.success(editingProductId ? '수정 완료' : '추가 완료')
      setFormOpen(false)
      fetchProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: ProductRow) => {
    if (!confirm(`"${p.attribute01}" 상품을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/products/${p.seller_id}/${p.product_id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success('삭제 완료')
      fetchProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  if (!user) return null
  if (!canManage) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>상품 관리는 판매회사 대표/관리자만 사용 가능합니다.</div>
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ backgroundColor: 'cadetblue', padding: '8px 15px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>상품 관리</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={openAddForm} style={{ padding: '4px 16px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'MintCream', border: '1px solid #999' }}>
            + 상품 추가
          </button>
          <button onClick={() => router.push('/my-company')} style={{ padding: '4px 16px', cursor: 'pointer' }}>
            신BS로 돌아가기
          </button>
        </div>
      </div>

      {/* 상품 목록 */}
      <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', border: '1px solid silver', marginBottom: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ccffcc' }}>
              <th style={thStyle}>품명</th>
              <th style={thStyle}>색깔</th>
              <th style={thStyle}>두께</th>
              <th style={thStyle}>사이즈</th>
              <th style={thStyle}>마대량</th>
              {GRADE_FIELDS.map(g => (
                <th key={g.grade} style={{ ...thStyle, textAlign: 'right', fontSize: '11px' }}>{g.grade}</th>
              ))}
              <th style={thStyle}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6 + GRADE_FIELDS.length} style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6 + GRADE_FIELDS.length} style={{ padding: '20px', textAlign: 'center' }}>상품이 없습니다.</td></tr>
            ) : products.map(p => (
              <tr key={p.product_id} style={{ borderBottom: '1px solid #ddd' }} className="hover:bg-gray-50">
                <td style={tdStyle}>{p.attribute01}</td>
                <td style={tdStyle}>{p.attribute02}</td>
                <td style={tdStyle}>{p.attribute03}</td>
                <td style={tdStyle}>{p.attribute04}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{p.attribute05}</td>
                {GRADE_FIELDS.map(g => (
                  <td key={g.field} style={{ ...tdStyle, textAlign: 'right' }}>{Number(p[g.field] || 0).toLocaleString()}</td>
                ))}
                <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <span onClick={() => openEditForm(p)} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer', marginRight: '6px' }}>수정</span>
                  <span onClick={() => handleDelete(p)} style={{ color: 'red', textDecoration: 'underline', cursor: 'pointer' }}>삭제</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 추가/수정 폼 */}
      {formOpen && (
        <div style={{ backgroundColor: 'palegoldenrod', padding: '10px', border: '2px solid #999' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            {editingProductId ? `상품 수정 (ID: ${editingProductId})` : '새 상품 추가'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <div>
              <div style={labelStyle}>품명 *</div>
              <input value={form.attribute01} onChange={e => updateField('attribute01', e.target.value)} style={{ width: '120px', ...inputStyle }} />
            </div>
            <div>
              <div style={labelStyle}>색깔</div>
              <input value={form.attribute02} onChange={e => updateField('attribute02', e.target.value)} style={{ width: '80px', ...inputStyle }} />
            </div>
            <div>
              <div style={labelStyle}>두께</div>
              <input value={form.attribute03} onChange={e => updateField('attribute03', e.target.value)} style={{ width: '60px', ...inputStyle }} />
            </div>
            <div>
              <div style={labelStyle}>사이즈</div>
              <input value={form.attribute04} onChange={e => updateField('attribute04', e.target.value)} style={{ width: '100px', ...inputStyle }} />
            </div>
            <div>
              <div style={labelStyle}>마대량</div>
              <input value={form.attribute05} onChange={e => updateField('attribute05', e.target.value)} style={{ width: '60px', ...inputStyle }} />
            </div>
          </div>
          {/* 등급별 단가 - 2행으로 분할 */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
            {GRADE_FIELDS.slice(0, 10).map(g => (
              <div key={g.field}>
                <div style={labelStyle}>{g.grade}</div>
                <input type="number" value={form[g.field]} onChange={e => updateField(g.field, e.target.value)} style={{ width: '60px', ...inputStyle }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {GRADE_FIELDS.slice(10).map(g => (
              <div key={g.field}>
                <div style={labelStyle}>{g.grade}</div>
                <input type="number" value={form[g.field]} onChange={e => updateField(g.field, e.target.value)} style={{ width: '60px', ...inputStyle }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setFormOpen(false)} style={{ padding: '4px 16px', cursor: 'pointer' }}>취소</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '4px 16px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#90EE90' }}>
              {saving ? '저장 중...' : editingProductId ? '상품 수정' : '상품 추가'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '3px 5px', border: '1px solid silver', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '12px' }
const tdStyle: React.CSSProperties = { padding: '3px 5px', border: '1px solid silver', fontSize: '12px' }
const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#666' }
const inputStyle: React.CSSProperties = { padding: '2px 4px', fontSize: '12px' }
