'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

interface Customer {
  customer_id: string
  customer_name: string
  owner_name?: string
}

interface Props {
  customers: Customer[]
  value: string
  onChange: (customerId: string, customerName?: string) => void
  placeholder?: string
  width?: string
  showAll?: boolean  // true면 "전체" 옵션 표시
}

/**
 * 콤보박스형 거래처 검색 컴포넌트
 * 입력창 클릭 → 드롭다운 리스트 표시 → 글자 입력하면 필터링 → 항목 클릭하면 선택
 */
export function CustomerSearchSelect({ customers, value, onChange, placeholder = '거래처 검색 (ID 또는 이름)', width = '220px', showAll = false }: Props) {
  const [searchText, setSearchText] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 선택된 거래처의 표시명
  const selectedDisplay = useMemo(() => {
    if (!value) return ''
    const c = customers.find(c => c.customer_id === value || c.customer_name === value)
    return c ? `${c.customer_id}-${c.customer_name} (${c.owner_name || ''})` : value
  }, [value, customers])

  // 검색어로 필터링된 거래처 목록
  const filteredItems = useMemo(() => {
    const items: { id: string; name: string; label: string; isAll?: boolean }[] = []
    if (showAll) {
      items.push({ id: '', name: '', label: '전체', isAll: true })
    }
    const keyword = searchText.trim().toLowerCase()
    const filtered = keyword
      ? customers.filter(c =>
          c.customer_name?.toLowerCase().includes(keyword) ||
          c.owner_name?.toLowerCase().includes(keyword) ||
          c.customer_id?.toLowerCase().includes(keyword)
        )
      : customers
    filtered.forEach(c => {
      items.push({
        id: c.customer_id,
        name: c.customer_name,
        label: `${c.customer_id}-${c.customer_name} (${c.owner_name || ''})`,
      })
    })
    return items
  }, [customers, searchText, showAll])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        // 선택된 값이 있으면 검색어 초기화
        if (value) setSearchText('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  // 하이라이트된 항목이 보이도록 스크롤
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const items = listRef.current.children
      if (items[highlightIdx]) {
        (items[highlightIdx] as HTMLElement).scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightIdx])

  const handleSelect = (item: typeof filteredItems[0]) => {
    onChange(item.id, item.name)
    setSearchText('')
    setOpen(false)
    setHighlightIdx(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx(prev => Math.min(prev + 1, filteredItems.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIdx >= 0 && highlightIdx < filteredItems.length) {
          handleSelect(filteredItems[highlightIdx])
        }
        break
      case 'Escape':
        setOpen(false)
        setHighlightIdx(-1)
        break
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block', width }}>
      {/* 입력창 */}
      <input
        type="text"
        value={open ? searchText : (value ? selectedDisplay : searchText)}
        onChange={(e) => {
          setSearchText(e.target.value)
          setOpen(true)
          setHighlightIdx(-1)
        }}
        onFocus={() => {
          setOpen(true)
          if (value) setSearchText('')
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '6px 8px',
          fontSize: '14px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* 드롭다운 리스트 */}
      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '250px',
            overflowY: 'auto',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            zIndex: 9999,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ padding: '8px 12px', color: '#999', fontSize: '13px' }}>
              검색 결과 없음
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.isAll ? '__all__' : item.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(item)
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor:
                    highlightIdx === idx ? '#e0edff'
                    : (item.id === value && !item.isAll) ? '#f0f7ff'
                    : 'white',
                  fontWeight: item.isAll ? 'bold' : 'normal',
                  borderBottom: item.isAll ? '1px solid #eee' : 'none',
                }}
              >
                {item.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
