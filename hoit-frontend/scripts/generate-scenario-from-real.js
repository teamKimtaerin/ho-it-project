#!/usr/bin/env node
/*
 * Generate MotionText v1.3 scenario.json from public/real.json
 * Usage: node scripts/generate-scenario-from-real.js [--in public/real.json] [--out public/scenario.json]
 */
const fs = require('fs')
const path = require('path')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8')
}

function toSeconds(v) {
  // Accept number seconds or HH:MM:SS / MM:SS
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.includes(':')) {
    const parts = v.split(':').map(Number)
    if (parts.length === 3)
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
    if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  }
  return Number(v) || 0
}

function buildScenarioFromSegments(segments) {
  const stageW = 640
  const stageH = 360
  const marginY = 32
  const boxW = Math.round(stageW * 0.88)
  const boxH = 64
  const centerX = Math.round(stageW / 2)
  const centerY = Math.max(0, Math.min(stageH, stageH - marginY - boxH / 2))
  const fontSizeRel = 0.05
  const pluginName = 'elastic@2.0.0'

  const cues = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const start = toSeconds(seg.start_time)
    const end = toSeconds(seg.end_time)
    const text = seg.text || ''
    cues.push({
      id: `cue-${i}`,
      track: 'editor',
      hintTime: { start, end },
      root: {
        e_type: 'group',
        layout: {
          position: { x: centerX / stageW, y: centerY / stageH },
          anchor: 'cc',
          size: { width: boxW / stageW, height: boxH / stageH },
        },
        children: [
          {
            e_type: 'text',
            text,
            absStart: start,
            absEnd: end,
            layout: {
              position: { x: 0.5, y: 0.5 },
              anchor: 'cc',
              size: { width: 'auto', height: 'auto' },
              overflow: 'visible',
            },
            style: {
              fontSizeRel,
              fontFamily: 'Arial, sans-serif',
              color: '#ffffff',
              align: 'center',
              whiteSpace: 'nowrap',
            },
            pluginChain: [
              { name: pluginName, params: {}, relStartPct: 0, relEndPct: 1 },
            ],
          },
        ],
      },
    })
  }

  return {
    version: '1.3',
    timebase: { unit: 'seconds' },
    stage: { baseAspect: '16:9' },
    tracks: [{ id: 'editor', type: 'free', layer: 1 }],
    cues,
  }
}

function main() {
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const outIdx = args.indexOf('--out')
  const inPath = path.resolve(
    process.cwd(),
    inIdx >= 0 ? args[inIdx + 1] : 'public/real.json'
  )
  const outPath = path.resolve(
    process.cwd(),
    outIdx >= 0 ? args[outIdx + 1] : 'public/scenario.json'
  )

  if (!fs.existsSync(inPath)) {
    console.error(`Input not found: ${inPath}`)
    process.exit(1)
  }
  const data = readJson(inPath)
  const segments = Array.isArray(data?.segments) ? data.segments : []
  if (segments.length === 0) {
    console.error('No segments found in real.json')
    process.exit(2)
  }
  const scenario = buildScenarioFromSegments(segments)
  writeJson(outPath, scenario)
  console.log(`Wrote scenario to ${outPath}`)
}

if (require.main === module) main()
