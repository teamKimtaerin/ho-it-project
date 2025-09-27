/**
 * Expression Evaluator
 *
 * Safe evaluation of mathematical expressions with template variables
 * Supports complex expressions like: ({{volume_statistics.global_max_db}} - {{volume_statistics.baseline_db}}) * 9/10 + {{volume_statistics.baseline_db}}
 */

import { ExpressionContext } from '../types/rule.types'
// import { ExpressionHelpers } from '../types/rule.types' // Unused import

export class ExpressionEvaluator {
  private readonly OPERATORS = {
    '+': { precedence: 1, associativity: 'left' },
    '-': { precedence: 1, associativity: 'left' },
    '*': { precedence: 2, associativity: 'left' },
    '/': { precedence: 2, associativity: 'left' },
    '%': { precedence: 2, associativity: 'left' },
    '^': { precedence: 3, associativity: 'right' },
    '**': { precedence: 3, associativity: 'right' },
  }

  private readonly FUNCTIONS = new Set([
    'min',
    'max',
    'avg',
    'abs',
    'round',
    'sin',
    'cos',
    'tan',
    'sqrt',
    'log',
    'exp',
    'floor',
    'ceil',
    'percentile',
    'standardDeviation',
    'dbToLinear',
    'linearToDb',
    'hzToMidi',
    'midiToHz',
  ])

  /**
   * Evaluate a mathematical expression safely
   */
  evaluate(
    expression: string,
    context: ExpressionContext
  ): number | string | boolean {
    try {
      // First, interpolate all variables
      const interpolated = this.interpolateVariables(expression, context)

      // Parse and evaluate the mathematical expression
      const tokens = this.tokenize(interpolated)
      const postfix = this.infixToPostfix(tokens)
      const result = this.evaluatePostfix(postfix, context)

      return result
    } catch (error) {
      throw new Error(
        `Expression evaluation failed for "${expression}": ${error}`
      )
    }
  }

  /**
   * Interpolate template variables in the expression
   */
  private interpolateVariables(
    expression: string,
    context: ExpressionContext
  ): string {
    let result = expression

    // Replace global variables {{variable_path}}
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, varPath) => {
      const value = this.resolveGlobalVariable(varPath.trim(), context)
      return this.formatNumber(value)
    })

    // Replace word-level variables [[field_name]]
    result = result.replace(/\[\[([^\]]+)\]\]/g, (match, fieldName) => {
      const value = this.resolveWordVariable(fieldName.trim(), context)
      return this.formatNumber(value)
    })

    return result
  }

  /**
   * Resolve global variable path from audio analysis data
   */
  private resolveGlobalVariable(
    path: string,
    context: ExpressionContext
  ): unknown {
    // Handle special context variables
    if (path === 'wordIndex') return context.wordIndex
    if (path === 'segmentIndex') return context.segmentIndex
    if (path === 'wordPositionInSegment') return context.wordPositionInSegment

    // Handle computed template variables
    if (context.variables[path] !== undefined) {
      return context.variables[path]
    }

    // Navigate through object path in audioData
    const pathParts = path.split('.')
    let value: unknown = context.audioData

    for (const part of pathParts) {
      if (value === null || value === undefined) {
        throw new Error(
          `Cannot access property '${part}' of ${value} in path '${path}'`
        )
      }
      value = (value as Record<string, unknown>)[part]
    }

    if (value === undefined) {
      throw new Error(`Variable path '${path}' not found in audio data`)
    }

    return value
  }

  /**
   * Resolve word-level variable from current word context
   */
  private resolveWordVariable(
    fieldName: string,
    context: ExpressionContext
  ): unknown {
    // Direct word properties
    if (fieldName in context.word) {
      return (context.word as unknown as Record<string, unknown>)[fieldName]
    }

    // Segment properties with prefix
    if (fieldName.startsWith('segment.')) {
      const segmentField = fieldName.substring(8)
      return this.getNestedProperty(context.segment, segmentField)
    }

    throw new Error(`Unknown word variable: ${fieldName}`)
  }

  /**
   * Get nested property from object using dot notation
   */
  private getNestedProperty(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        throw new Error(`Cannot access property '${key}' of ${current}`)
      }
      return (current as Record<string, unknown>)[key]
    }, obj)
  }

  /**
   * Format number for expression interpolation
   */
  private formatNumber(value: unknown): string {
    if (typeof value === 'number') {
      // Preserve precision for calculations
      return Number.isInteger(value) ? value.toString() : value.toString()
    }
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return value
    }
    // For non-numeric values, wrap in quotes for string operations
    return `"${String(value)}"`
  }

  /**
   * Tokenize expression into components
   */
  private tokenize(expression: string): string[] {
    const tokens: string[] = []
    let current = ''
    let _inFunction = false
    let _parenCount = 0

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i]

      if (char === ' ') {
        if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }
        continue
      }

      if (char === '(') {
        if (current.trim() && this.FUNCTIONS.has(current.trim())) {
          tokens.push(current.trim())
          current = ''
          _inFunction = true
        } else if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }
        tokens.push(char)
        _parenCount++
      } else if (char === ')') {
        if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }
        tokens.push(char)
        _parenCount--
      } else if (char === ',') {
        if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }
        tokens.push(char)
      } else if (this.isOperator(char)) {
        if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }

        // Handle multi-character operators like **
        if (char === '*' && expression[i + 1] === '*') {
          tokens.push('**')
          i++ // skip next character
        } else {
          tokens.push(char)
        }
      } else {
        current += char
      }
    }

    if (current.trim()) {
      tokens.push(current.trim())
    }

    return tokens
  }

  /**
   * Convert infix notation to postfix (Shunting Yard algorithm)
   */
  private infixToPostfix(tokens: string[]): string[] {
    const output: string[] = []
    const operators: string[] = []

    for (const token of tokens) {
      if (this.isNumber(token) || this.isString(token)) {
        output.push(token)
      } else if (this.FUNCTIONS.has(token)) {
        operators.push(token)
      } else if (token === ',') {
        // Pop operators until we find opening parenthesis
        while (
          operators.length > 0 &&
          operators[operators.length - 1] !== '('
        ) {
          output.push(operators.pop()!)
        }
      } else if (token === '(') {
        operators.push(token)
      } else if (token === ')') {
        // Pop operators until opening parenthesis
        while (
          operators.length > 0 &&
          operators[operators.length - 1] !== '('
        ) {
          output.push(operators.pop()!)
        }
        if (operators.length > 0) {
          operators.pop() // Remove opening parenthesis
        }
        // If there's a function on the stack, pop it to output
        if (
          operators.length > 0 &&
          this.FUNCTIONS.has(operators[operators.length - 1])
        ) {
          output.push(operators.pop()!)
        }
      } else if (this.isOperator(token)) {
        const op = this.OPERATORS[token as keyof typeof this.OPERATORS]

        while (
          operators.length > 0 &&
          operators[operators.length - 1] !== '(' &&
          this.OPERATORS[
            operators[operators.length - 1] as keyof typeof this.OPERATORS
          ] &&
          (this.OPERATORS[
            operators[operators.length - 1] as keyof typeof this.OPERATORS
          ].precedence > op.precedence ||
            (this.OPERATORS[
              operators[operators.length - 1] as keyof typeof this.OPERATORS
            ].precedence === op.precedence &&
              op.associativity === 'left'))
        ) {
          output.push(operators.pop()!)
        }

        operators.push(token)
      }
    }

    // Pop remaining operators
    while (operators.length > 0) {
      output.push(operators.pop()!)
    }

    return output
  }

  /**
   * Evaluate postfix expression
   */
  private evaluatePostfix(
    tokens: string[],
    context: ExpressionContext
  ): number | string {
    const stack: (number | string)[] = []

    for (const token of tokens) {
      if (this.isNumber(token)) {
        stack.push(parseFloat(token))
      } else if (this.isString(token)) {
        // Remove quotes from string literals
        stack.push(token.slice(1, -1))
      } else if (this.isOperator(token)) {
        const b = stack.pop()!
        const a = stack.pop()!
        const result = this.applyOperator(token, a, b)
        stack.push(result)
      } else if (this.FUNCTIONS.has(token)) {
        const result = this.applyFunction(token, stack, context)
        stack.push(result)
      }
    }

    if (stack.length !== 1) {
      throw new Error(
        'Invalid expression: stack should contain exactly one value'
      )
    }

    return stack[0]
  }

  /**
   * Apply binary operator
   */
  private applyOperator(
    operator: string,
    a: number | string,
    b: number | string
  ): number | string {
    // Handle string concatenation
    if (operator === '+' && (typeof a === 'string' || typeof b === 'string')) {
      return String(a) + String(b)
    }

    // Convert to numbers for mathematical operations
    const numA = typeof a === 'string' ? parseFloat(a) : a
    const numB = typeof b === 'string' ? parseFloat(b) : b

    if (isNaN(numA) || isNaN(numB)) {
      throw new Error(
        `Cannot apply operator '${operator}' to non-numeric values: ${a}, ${b}`
      )
    }

    switch (operator) {
      case '+':
        return numA + numB
      case '-':
        return numA - numB
      case '*':
        return numA * numB
      case '/':
        if (numB === 0) throw new Error('Division by zero')
        return numA / numB
      case '%':
        return numA % numB
      case '^':
      case '**':
        return Math.pow(numA, numB)
      default:
        throw new Error(`Unknown operator: ${operator}`)
    }
  }

  /**
   * Apply function with arguments from stack
   */
  private applyFunction(
    funcName: string,
    stack: (number | string)[],
    context: ExpressionContext
  ): number | string {
    const helpers = context.helpers

    switch (funcName) {
      case 'min': {
        const args = this.popFunctionArgs(stack, 2)
        return helpers.min(...args.map(Number))
      }
      case 'max': {
        const args = this.popFunctionArgs(stack, 2)
        return helpers.max(...args.map(Number))
      }
      case 'avg': {
        const args = this.popFunctionArgs(stack, -1) // Variable args
        return helpers.avg(args.map(Number))
      }
      case 'abs': {
        const arg = stack.pop()!
        return helpers.abs(Number(arg))
      }
      case 'round': {
        const decimals = stack.length > 1 ? Number(stack.pop()!) : 0
        const value = Number(stack.pop()!)
        return helpers.round(value, decimals)
      }
      case 'percentile': {
        const p = Number(stack.pop()!)
        const values = this.popFunctionArgs(stack, -1)
        return helpers.percentile(values.map(Number), p)
      }
      case 'standardDeviation': {
        const args = this.popFunctionArgs(stack, -1)
        return helpers.standardDeviation(args.map(Number))
      }
      case 'dbToLinear': {
        const db = Number(stack.pop()!)
        return helpers.dbToLinear(db)
      }
      case 'linearToDb': {
        const linear = Number(stack.pop()!)
        return helpers.linearToDb(linear)
      }
      case 'hzToMidi': {
        const hz = Number(stack.pop()!)
        return helpers.hzToMidi(hz)
      }
      case 'midiToHz': {
        const midi = Number(stack.pop()!)
        return helpers.midiToHz(midi)
      }
      // Math functions
      case 'sin':
        return Math.sin(Number(stack.pop()!))
      case 'cos':
        return Math.cos(Number(stack.pop()!))
      case 'tan':
        return Math.tan(Number(stack.pop()!))
      case 'sqrt':
        return Math.sqrt(Number(stack.pop()!))
      case 'log':
        return Math.log(Number(stack.pop()!))
      case 'exp':
        return Math.exp(Number(stack.pop()!))
      case 'floor':
        return Math.floor(Number(stack.pop()!))
      case 'ceil':
        return Math.ceil(Number(stack.pop()!))

      default:
        throw new Error(`Unknown function: ${funcName}`)
    }
  }

  /**
   * Pop function arguments from stack
   */
  private popFunctionArgs(
    stack: (number | string)[],
    count: number
  ): (number | string)[] {
    if (count === -1) {
      // Variable arguments - pop all remaining
      const args = [...stack]
      stack.length = 0
      return args.reverse()
    }

    const args: (number | string)[] = []
    for (let i = 0; i < count && stack.length > 0; i++) {
      args.unshift(stack.pop()!)
    }
    return args
  }

  /**
   * Check if token is an operator
   */
  private isOperator(token: string): boolean {
    return token in this.OPERATORS
  }

  /**
   * Check if token is a number
   */
  private isNumber(token: string): boolean {
    return !isNaN(Number(token)) && !isNaN(parseFloat(token))
  }

  /**
   * Check if token is a string literal
   */
  private isString(token: string): boolean {
    return token.startsWith('"') && token.endsWith('"')
  }
}
