/**
 * 대용량 SQL 파일을 Supabase SQL Editor 크기 제한에 맞게 분할
 * 각 파일당 ~200건씩 분할 (약 50~80KB)
 */
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, 'output')
const ROWS_PER_FILE = 200

function splitFile(filename) {
  const filePath = path.join(OUTPUT_DIR, filename)
  const content = fs.readFileSync(filePath, 'utf8')

  // 헤더 (주석) 추출
  const lines = content.split('\n')
  const headerLines = []
  let i = 0
  while (i < lines.length && (lines[i].startsWith('--') || lines[i].trim() === '')) {
    headerLines.push(lines[i])
    i++
  }

  // INSERT 문 블록 추출 (INSERT ... VALUES ... ON CONFLICT DO NOTHING;)
  // 각 블록은 INSERT로 시작하고 ON CONFLICT DO NOTHING;으로 끝남
  const insertBlocks = []
  let currentBlock = null

  for (; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('INSERT INTO')) {
      // 새 INSERT 블록 시작 - 테이블명과 컬럼 추출
      currentBlock = { header: line, rows: [] }
    } else if (line.trim() === 'ON CONFLICT DO NOTHING;') {
      if (currentBlock) {
        insertBlocks.push(currentBlock)
        currentBlock = null
      }
    } else if (currentBlock && line.trim()) {
      // 행 데이터 (쉼표로 끝나거나 안 끝남)
      currentBlock.rows.push(line)
    }
  }

  // 모든 행을 합치기
  let allRows = []
  let insertHeader = ''
  for (const block of insertBlocks) {
    insertHeader = block.header
    allRows = allRows.concat(block.rows)
  }

  if (allRows.length === 0) {
    console.log(`  SKIP: no rows found in ${filename}`)
    return
  }

  // 분할
  const baseName = filename.replace('.sql', '')
  const totalParts = Math.ceil(allRows.length / ROWS_PER_FILE)

  for (let p = 0; p < totalParts; p++) {
    const start = p * ROWS_PER_FILE
    const end = Math.min(start + ROWS_PER_FILE, allRows.length)
    const chunk = allRows.slice(start, end)

    // 마지막 행의 쉼표를 제거
    const processedChunk = chunk.map((row, idx) => {
      const trimmed = row.trimEnd()
      if (idx === chunk.length - 1) {
        // 마지막 행: 쉼표 제거
        return trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed
      } else {
        // 중간 행: 쉼표 확인
        return trimmed.endsWith(',') ? trimmed : trimmed + ','
      }
    })

    const partNum = String(p + 1).padStart(2, '0')
    const partFile = `${baseName}_part${partNum}.sql`

    let output = `-- ${baseName} part ${p + 1}/${totalParts} (rows ${start + 1}-${end})\n\n`
    output += insertHeader + '\n'
    output += processedChunk.join('\n') + '\n'
    output += 'ON CONFLICT DO NOTHING;\n'

    fs.writeFileSync(path.join(OUTPUT_DIR, partFile), output, 'utf8')
  }

  console.log(`  ${filename} → ${totalParts} parts (${allRows.length} rows, ${ROWS_PER_FILE}/file)`)
}

console.log('=== 대용량 SQL 분할 ===\n')
splitFile('10_orders_m.sql')
splitFile('11_orders_d.sql')
// products도 92KB라 분할
splitFile('09_products.sql')
// trading_stubs도 혹시 몰라서
splitFile('12_trading_stubs_m.sql')
splitFile('13_trading_stubs_d.sql')
splitFile('06_customers.sql')
console.log('\n완료! part 파일들을 순서대로 실행하세요.')
