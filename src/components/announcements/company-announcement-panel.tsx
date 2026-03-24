'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

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
  companyName: string
  logoSrc?: string
  gradientFrom?: string
  gradientTo?: string
  href?: string
}

export function CompanyAnnouncementPanel({
  companyId,
  companyName,
  logoSrc,
  gradientFrom = '#4ade80',
  gradientTo = '#60a5fa',
  href = '#',
}: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)

  useEffect(() => {
    fetch(`/api/announcements?company_id=${companyId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAnnouncements(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  const handlePrevious = () => {
    setCurrentIndex(prev => prev === 0 ? announcements.length - 1 : prev - 1)
  }

  const handleNext = () => {
    setCurrentIndex(prev => prev === announcements.length - 1 ? 0 : prev + 1)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return `${date.getMonth() + 1}월 ${date.getDate()}일`
    } catch {
      return ''
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

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'urgent': return 'border-red-400 bg-red-50'
      case 'important': return 'border-orange-400 bg-orange-50'
      case 'event': return 'border-green-400 bg-green-50'
      case 'system': return 'border-gray-400 bg-gray-50'
      default: return 'border-blue-400 bg-blue-50'
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', overflow: 'hidden' }}>
      {/* Company Header */}
      <div
        style={{ padding: '6px 10px', background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {logoSrc ? (
            <div style={{ width: '36px', height: '36px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
              <img src={logoSrc} alt={companyName} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
              {companyName.substring(0, 2)}
            </div>
          )}
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{companyName}</span>
          <a
            href={href}
            style={{
              marginLeft: 'auto',
              padding: '3px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#333',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              textDecoration: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            바로가기
          </a>
        </div>
      </div>

      {/* Announcement Section */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-700 text-sm">공지사항</h4>
          {announcements.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {currentIndex + 1} / {announcements.length}
              </span>
              {announcements.length > 1 && (
                <div className="flex space-x-1">
                  <button onClick={handlePrevious} className="p-1 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={handleNext} className="p-1 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-sm">
            등록된 공지사항이 없습니다
          </div>
        ) : (
          <div>
            {(() => {
              const ann = announcements[currentIndex]
              return (
                <div
                  key={ann.announcementid}
                  className={`border-l-3 pl-3 py-2 rounded-r-lg cursor-pointer ${getTypeStyle(ann.type)}`}
                  onClick={() => setSelectedAnnouncement(ann)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                        <span className="mr-1 text-sm">{getTypeIcon(ann.type)}</span>
                        <h5 className="font-medium text-gray-900 text-sm truncate">{ann.title}</h5>
                      </div>
                      <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">{ann.content}</p>
                    </div>
                    {ann.createdat && (
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatDate(ann.createdat)}
                      </span>
                    )}
                  </div>
                  {ann.type !== 'normal' && (
                    <div className="mt-1">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${ann.color}20`, color: ann.color }}
                      >
                        {getTypeIcon(ann.type)} {getTypeLabel(ann.type)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedAnnouncement(null)}>
          <div className="bg-white shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getTypeIcon(selectedAnnouncement.type)}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                      {getTypeLabel(selectedAnnouncement.type)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white leading-snug">{selectedAnnouncement.title}</h2>
                  <p className="text-white/80 text-xs mt-1">
                    {companyName} · {selectedAnnouncement.createdat
                      ? new Date(selectedAnnouncement.createdat).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                      : ''}
                  </p>
                </div>
                <button onClick={() => setSelectedAnnouncement(null)} className="text-white/70 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{selectedAnnouncement.content}</div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button onClick={() => setSelectedAnnouncement(null)} className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
