'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Announcement {
  announcementid: number
  companyid: string
  title: string
  content: string
  isactive: boolean
  priority: number
  createdby: string
  createdat: string
  startdate: string | null
  enddate: string | null
  type: string
  color: string
}

interface Props {
  companyId: string
  userName: string
}

export function AnnouncementManager({ companyId, userName }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'normal' as string,
    color: '#3B82F6',
    priority: 0,
    startDate: '',
    endDate: '',
  })

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      // 관리자용: 모든 공지사항 (활성/비활성 모두)
      const res = await fetch(`/api/announcements?company_id=${companyId}`)
      const data = await res.json()
      if (Array.isArray(data)) setAnnouncements(data)
    } catch {
      toast.error('공지사항 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (companyId) fetchAnnouncements()
  }, [companyId])

  const resetForm = () => {
    setFormData({ title: '', content: '', type: 'normal', color: '#3B82F6', priority: 0, startDate: '', endDate: '' })
    setEditing(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (ann: Announcement) => {
    setEditing(ann)
    setFormData({
      title: ann.title,
      content: ann.content,
      type: ann.type,
      color: ann.color,
      priority: ann.priority,
      startDate: ann.startdate ? ann.startdate.split('T')[0] : '',
      endDate: ann.enddate ? ann.enddate.split('T')[0] : '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('제목과 내용을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const res = await fetch('/api/announcements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            announcementid: editing.announcementid,
            title: formData.title.trim(),
            content: formData.content.trim(),
            type: formData.type,
            color: formData.color,
            priority: formData.priority,
            startdate: formData.startDate || null,
            enddate: formData.endDate || null,
          }),
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        toast.success('공지사항 수정 완료')
      } else {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyid: companyId,
            title: formData.title.trim(),
            content: formData.content.trim(),
            type: formData.type,
            color: formData.color,
            priority: formData.priority,
            createdby: userName,
            startdate: formData.startDate || null,
            enddate: formData.endDate || null,
          }),
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        toast.success('공지사항 추가 완료')
      }
      setShowModal(false)
      resetForm()
      fetchAnnouncements()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success('삭제 완료')
      fetchAnnouncements()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  const handleToggleActive = async (ann: Announcement) => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementid: ann.announcementid, isactive: !ann.isactive }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      toast.success(ann.isactive ? '비활성화 완료' : '활성화 완료')
      fetchAnnouncements()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '변경 실패')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return '\u{1F6A8}'
      case 'important': return '\u26A0\uFE0F'
      case 'event': return '\u{1F389}'
      case 'system': return '\u2699\uFE0F'
      default: return '\u{1F4E2}'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'urgent': return '\uAE34\uAE09'
      case 'important': return '\uC911\uC694'
      case 'event': return '\uC774\uBCA4\uD2B8'
      case 'system': return '\uC2DC\uC2A4\uD15C'
      default: return '\uC77C\uBC18'
    }
  }

  const typeColors: Record<string, string> = {
    normal: '#3B82F6', important: '#F59E0B', urgent: '#EF4444', event: '#10B981', system: '#6B7280'
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">공지사항 관리</h3>
        <Button onClick={openAddModal} size="sm">+ 새 공지사항</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8 text-gray-400">등록된 공지사항이 없습니다.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2 text-center w-12">유형</th>
              <th className="p-2 text-left">제목</th>
              <th className="p-2 text-center w-16">상태</th>
              <th className="p-2 text-center w-16">우선순위</th>
              <th className="p-2 text-center w-20">작성자</th>
              <th className="p-2 text-center w-24">작성일</th>
              <th className="p-2 text-center w-40">관리</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map(ann => (
              <tr key={ann.announcementid} className="border-b hover:bg-gray-50">
                <td className="p-2 text-center">
                  <span title={getTypeLabel(ann.type)}>{getTypeIcon(ann.type)}</span>
                </td>
                <td className="p-2">
                  <span className="font-medium">{ann.title}</span>
                  <p className="text-xs text-gray-500 truncate">{ann.content}</p>
                </td>
                <td className="p-2 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ann.isactive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {ann.isactive ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="p-2 text-center text-xs">{ann.priority}</td>
                <td className="p-2 text-center text-xs">{ann.createdby}</td>
                <td className="p-2 text-center text-xs">{ann.createdat ? new Date(ann.createdat).toLocaleDateString() : ''}</td>
                <td className="p-2 text-center space-x-1">
                  <button onClick={() => handleToggleActive(ann)} className={`px-2 py-1 rounded text-xs ${ann.isactive ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>
                    {ann.isactive ? '비활성화' : '활성화'}
                  </button>
                  <button onClick={() => openEditModal(ann)} className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">수정</button>
                  <button onClick={() => handleDelete(ann.announcementid)} className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 hover:bg-red-200">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="bg-purple-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editing ? '공지사항 수정' : '새 공지사항 추가'}</h3>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <Label className="text-sm">제목 *</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="공지사항 제목" maxLength={200} />
              </div>
              <div>
                <Label className="text-sm">내용 *</Label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="공지사항 내용"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">유형</Label>
                  <select
                    value={formData.type}
                    onChange={e => {
                      const type = e.target.value
                      setFormData({ ...formData, type, color: typeColors[type] || '#3B82F6' })
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="normal">일반</option>
                    <option value="important">중요</option>
                    <option value="urgent">긴급</option>
                    <option value="event">이벤트</option>
                    <option value="system">시스템</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm">우선순위 (0~10)</Label>
                  <Input type="number" value={formData.priority} onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} min={0} max={10} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">시작일 (선택)</Label>
                  <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <Label className="text-sm">종료일 (선택)</Label>
                  <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm() }} disabled={saving}>취소</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : (editing ? '수정' : '추가')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
