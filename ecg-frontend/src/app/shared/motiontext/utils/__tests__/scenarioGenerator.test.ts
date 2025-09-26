import {
  generatePreviewScenario,
  validateAndNormalizeParams,
  generatePreviewScenarioV2,
  generateLoopedScenarioV2,
  computeBaseTimeAndOffset,
} from '@/app/shared/motiontext/utils/scenarioGenerator'

describe('scenarioGenerator', () => {
  test('generatePreviewScenario builds a valid config with pluginChain', () => {
    const cfg = generatePreviewScenario(
      'elastic@2.0.0',
      {
        text: 'Hello',
        position: { x: 100, y: 200 },
        size: { width: 400, height: 100 },
        pluginParams: {},
        fontSizeRel: 0.07,
      },
      3
    )
    expect(cfg.version).toBe('1.3')
    expect(cfg.stage.baseAspect).toBe('16:9')
    expect(cfg.cues.length).toBe(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root: any = cfg.cues[0].root
    expect(root.e_type).toBe('group')
    const textNode = root.children[0]
    expect(textNode.e_type).toBe('text')
    expect(Array.isArray(textNode.pluginChain)).toBe(true)
    expect(textNode.pluginChain[0].name).toContain('elastic')
    expect(textNode.layout.anchor).toBe('cc')
  })

  test('validateAndNormalizeParams clamps numbers and coerces types', () => {
    const manifest = {
      name: 'elastic',
      version: '2.0.0',
      pluginApi: '2.1',
      targets: ['text'],
      schema: {
        strength: {
          type: 'number',
          label: 'Strength',
          description: '',
          default: 50,
          min: 0,
          max: 100,
        },
        enabled: {
          type: 'boolean',
          label: 'Enabled',
          description: '',
          default: true,
        },
        mode: {
          type: 'select',
          label: 'Mode',
          description: '',
          default: 'in',
          enum: ['in', 'out'],
        },
        label: {
          type: 'string',
          label: 'Label',
          description: '',
          default: 'x',
        },
      },
    } as const

    const normalized = validateAndNormalizeParams(
      { strength: 200, enabled: 0, mode: 'invalid', label: 123 as unknown },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      manifest as any
    )
    expect(normalized.strength).toBe(100)
    expect(normalized.enabled).toBe(false)
    expect(normalized.mode).toBe('in')
    expect(normalized.label).toBe('123')
  })

  test('generatePreviewScenarioV2 emits v2.0 structure with baseTime/timeOffset', () => {
    const cfg = generatePreviewScenarioV2(
      'elastic@2.0.0',
      {
        text: 'Hello',
        position: { x: 100, y: 200 },
        size: { width: 400, height: 100 },
        pluginParams: {},
        fontSizeRel: 0.06,
      },
      3
    )
    expect(cfg.version).toBe('2.0')
    expect(cfg.pluginApiVersion).toBe('3.0')
    expect(cfg.cues.length).toBe(1)
    const root = cfg.cues[0].root
    expect(root.eType).toBe('group')
    const textNode = root.children?.[0] as any // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(textNode?.eType).toBe('text')
    expect(Array.isArray(textNode?.pluginChain)).toBe(true)
    const spec = textNode?.pluginChain?.[0]
    expect(spec.name).toContain('elastic')
    expect(spec.baseTime).toEqual([0, 3])
    expect(spec.timeOffset).toEqual(['0%', '100%'])
  })

  test('generateLoopedScenarioV2 includes rotate and uses percent offsets', () => {
    const cfg = generateLoopedScenarioV2(
      'fadein@2.0.0',
      {
        text: 'Hi',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 50 },
        pluginParams: {},
        rotationDeg: 15,
        fontSizeRel: 0.07,
      },
      5
    )
    const root = cfg.cues[0].root as any // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(root.layout?.transform?.rotate?.deg).toBe(15)
    const textNode = root.children?.[0] as any // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(textNode.pluginChain?.[0].timeOffset).toEqual(['0%', '100%'])
  })

  test('computeBaseTimeAndOffset clamps and formats percentages', () => {
    const { baseTime, timeOffset } = computeBaseTimeAndOffset([2, 6], -0.2, 1.2)
    expect(baseTime).toEqual([2, 6])
    expect(timeOffset[0]).toBe('0%')
    expect(timeOffset[1]).toBe('100%')
  })
})
