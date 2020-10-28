import {Row} from "binlog-triggers-mysql"
const log = require("loglevel")

export type TrackExpression = (row: Row, tableName: string) => boolean

export function createTrackAffects(where, params): TrackExpression {
  if (!where) return () => true

  let impl = (...args) => true

  try {
    impl = expr(where, params)
  } catch (e) {
    log.debug("Failed to build affects expression. ", e.message)
    return () => true
  }

  return (row, tableName) => {
    try {
      const r = impl(row, tableName)
      // console.log("Checking affect for row", row, " is ", r)

      return r
    } catch (e) {
      // console.log({row, tableName})

      log.debug("Failed to calc affects. ", e.message)

      // affects by default
      return true
    }
  }
}

// parsing based on https://github.com/taozhi8833998/node-sql-parser/blob/master/ast/postgresql.ts

function expr(node, params) {
  // console.log(node)

  switch (node.type) {
    case "binary_expr":
      return binary_expr(node, params)

    case "string":
      if (node.value.startsWith(placeholderPrefix)) {
        const placeholderIndex = +node.value.substring(placeholderPrefix.length)

        if (placeholderIndex >= params.length)
          throw new Error("Query has more placeholders than params")

        return () => params[placeholderIndex]
      }
      return () => node.value

    case "number":
    case "single_quote_string":
    case "bool":
    case "null":
      return () => node.value

    case "column_ref":
      return column_ref(node)

    case "expr_list":
      return expr_list(node, params)

    default:
      // will be catched, and all rows matched
      // console.log(node)
      throw new Error("Unsupported node " + node.type)
  }
}

function column_ref(node) {
  return (row, tableName) => {
    if (node.table && node.table != tableName) {
      throw new Error(`Can't refer column ${node.table}.${node.column}`)
    }

    return row[node.column]
  }
}

function expr_list(node, params) {
  const items = node.value.map((v) => expr(v, params))

  return (row, tableName) => {
    return items.map((i) => i(row, tableName))
  }
}

function binary_expr(node, params) {
  const left = expr(node.left, params)
  const right = expr(node.right, params)

  return (row, tableName) => {
    const leftValue = left(row, tableName)
    const rightValue = right(row, tableName)

    // console.log("Calc", {node, leftValue, rightValue})

    switch (node.operator) {
      case "OR":
        return leftValue || rightValue
      case "AND":
        return leftValue && rightValue

      case "*":
        return leftValue * rightValue
      case "/":
        return leftValue / rightValue
      case "%":
        return leftValue % rightValue

      case "+":
        return leftValue + rightValue
      case "-":
        return leftValue - rightValue

      case ">=":
        return leftValue >= rightValue
      case ">":
        return leftValue > rightValue
      case "<=":
        return leftValue <= rightValue
      case "<>":
        return leftValue != rightValue
      case "<":
        return leftValue < rightValue
      case "=":
        return leftValue == rightValue
      case "!=":
        return leftValue != rightValue

      case "IN":
        return rightValue.indexOf(leftValue) >= 0
      case "NOT IN":
        return rightValue.indexOf(left) < 0
      case "LIKE":
        return like(leftValue, rightValue)
    }

    // will be catched, and all rows matched
    throw new Error("Unsupported node " + node.type)
  }
}

function like(leftValue, rightValue) {
  // TODO implement
  return true
}

export function wrapPlaceholders(s) {
  let r = ""

  s.split("?").forEach((part, i) => {
    if (i > 0) {
      r += `"${placeholderPrefix}${i - 1}"`
    }

    r += part
  })

  return r
}

const placeholderPrefix = "??"
