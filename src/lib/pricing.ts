import { GRADE_TO_PRICE_INDEX } from './constants'

/**
 * 기성품 가격 결정
 * Level1(일반가) / Level2(마대가) 등급에 따라 Products의 UnitPrice 컬럼 선택
 */
export function getReadyMadeUnitPrice(
  product: Record<string, number>,
  quantity: number,
  madaeCriteria: number,
  level1: string,
  level2: string
): number {
  const absQuantity = Math.abs(quantity)

  if (absQuantity < madaeCriteria) {
    // 일반가 (Level1 등급)
    return getUnitPriceByGrade(product, level1)
  } else {
    // 마대가 (Level2 등급) - 대량 할인
    return getUnitPriceByGrade(product, level2)
  }
}

/**
 * 등급 문자열로 UnitPrice 값 조회
 */
export function getUnitPriceByGrade(
  product: Record<string, number>,
  grade: string
): number {
  const index = GRADE_TO_PRICE_INDEX[grade]
  if (!index) return 0
  const key = `unit_price${String(index).padStart(2, '0')}`
  return product[key] ?? 0
}

/**
 * 맞춤품 단가 계산 공식
 *
 * 단가 = Round(ValueA + ValueB, 1)
 * ValueA (재료비) = 두께 × 폭 × (길이 + 5.0) × 0.184 × 등급상수
 * ValueB (인쇄비) = 도수값 == 0 ? 0 : max((도수값 × 8000 × 폭) / 45700, 2.0)
 */
export function calculateCustomPrice(params: {
  thickness: number    // 두께 (mm)
  width: number        // 폭 (mm)
  length: number       // 길이 (mm)
  colorCount: number   // 도수값 (0~6)
  gradeConstant: number // 등급상수 (예: 3.8, 4.0, ...)
}): number {
  const { thickness, width, length, colorCount, gradeConstant } = params

  // ValueA: 재료비
  const valueA = thickness * width * (length + 5.0) * 0.184 * gradeConstant

  // ValueB: 인쇄비
  let valueB = 0
  if (colorCount > 0) {
    valueB = Math.max((colorCount * 8000 * width) / 45700, 2.0)
  }

  // 소수점 1자리 반올림
  return Math.round((valueA + valueB) * 10) / 10
}

/**
 * 등급 문자열에서 숫자(등급상수) 추출
 * 예: "3.8급" → 3.8, "4.5급" → 4.5
 */
export function gradeToNumber(grade: string): number {
  const num = parseFloat(grade.replace('급', ''))
  return isNaN(num) ? 0 : num
}

/**
 * OrderID 생성 (.NET DateTime.Ticks 호환)
 * .NET Ticks: 0001-01-01 00:00:00부터 100나노초 단위
 */
export function generateOrderId(): string {
  const ticksPerMs = BigInt(10000)
  const epochOffset = BigInt('621355968000000000') // .NET epoch → Unix epoch offset
  const ticks = BigInt(Date.now()) * ticksPerMs + epochOffset
  return ticks.toString()
}

/**
 * 부가세 계산
 */
export function calculateVat(amount: number, vatRate: number = 10): number {
  return Math.round(amount * vatRate / 100)
}
