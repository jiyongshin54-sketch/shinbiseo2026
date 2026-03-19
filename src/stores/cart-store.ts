import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/lib/types'

interface CartStore {
  // 상태
  items: CartItem[]
  sellerId: string | null
  customerId: string | null
  customerName: string | null
  readyMade: '기성' | '맞춤'
  orderDate: string           // YYYY.MM.DD
  comment: string
  adjustment: number
  adjustmentSign: '+' | '-'
  vatRate: 0 | 10

  // 액션
  addItem: (item: Omit<CartItem, 'sequence'>) => void
  removeItem: (sequence: number) => void
  updateItem: (sequence: number, updates: Partial<CartItem>) => void
  setSeller: (id: string) => void
  setCustomerId: (id: string) => void
  setCustomer: (id: string, name: string) => void
  setReadyMade: (value: '기성' | '맞춤') => void
  setOrderDate: (date: string) => void
  setComment: (comment: string) => void
  setAdjustment: (amount: number) => void
  setAdjustmentSign: (sign: '+' | '-') => void
  setVatRate: (rate: 0 | 10) => void
  clearCart: () => void

  // 계산
  getSumAmount: () => number
  getAdjustedAmount: () => number
  getVatAmount: () => number
  getTotalAmount: () => number
  getItemCount: () => number
}

function getTodayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      items: [],
      sellerId: null,
      customerId: null,
      customerName: null,
      readyMade: '기성',
      orderDate: getTodayString(),
      comment: '',
      adjustment: 0,
      adjustmentSign: '+',
      vatRate: 10,

      // 액션
      addItem: (itemData) => {
        set((state) => {
          const maxSeq = state.items.reduce((max, item) => Math.max(max, item.sequence), 0)
          const newItem: CartItem = {
            ...itemData,
            sequence: maxSeq + 1,
          }
          return { items: [...state.items, newItem] }
        })
      },

      removeItem: (sequence) => {
        set((state) => ({
          items: state.items.filter((item) => item.sequence !== sequence),
        }))
      },

      updateItem: (sequence, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.sequence === sequence ? { ...item, ...updates } : item
          ),
        }))
      },

      setSeller: (id) => set({ sellerId: id }),
      setCustomerId: (id) => set({ customerId: id }),
      setCustomer: (id, name) => set({ customerId: id, customerName: name }),
      setReadyMade: (value) => set({ readyMade: value }),
      setOrderDate: (date) => set({ orderDate: date }),
      setComment: (comment) => set({ comment }),
      setAdjustment: (amount) => set({ adjustment: amount }),
      setAdjustmentSign: (sign) => set({ adjustmentSign: sign }),
      setVatRate: (rate) => set({ vatRate: rate }),

      clearCart: () =>
        set({
          items: [],
          customerId: null,
          customerName: null,
          comment: '',
          adjustment: 0,
          adjustmentSign: '+',
          orderDate: getTodayString(),
        }),

      // 계산
      getSumAmount: () => {
        return get().items.reduce((sum, item) => sum + item.amount, 0)
      },

      getAdjustedAmount: () => {
        const state = get()
        const sum = state.getSumAmount()
        const adj = state.adjustmentSign === '+' ? state.adjustment : -state.adjustment
        return sum + adj
      },

      getVatAmount: () => {
        const state = get()
        const adjusted = state.getAdjustedAmount()
        return Math.round(adjusted * state.vatRate / 100)
      },

      getTotalAmount: () => {
        const state = get()
        return state.getAdjustedAmount() + state.getVatAmount()
      },

      getItemCount: () => {
        return get().items.length
      },
    }),
    {
      name: 'shinbiseo-cart',
    }
  )
)
