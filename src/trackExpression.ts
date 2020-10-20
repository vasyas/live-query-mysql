import {Row} from "binlog-triggers-mysql"
const log = require("loglevel")

export type TrackExpression = (row: Row, tableName: string) => boolean

export function createTrackAffects(where): TrackExpression {
  if (!where) return always

  const impl = expr(where)

  return (row, tableName) => {
    try {
      return impl(row, tableName)
    } catch (e) {
      log.debug("Failed to calc affects ", e)

      // affects by default
      return true
    }
  }
}

// parsing based on https://github.com/taozhi8833998/node-sql-parser/blob/master/ast/postgresql.ts

function expr(node) {
  switch (node.type) {
    case "binary_expr":
      return binary_expr(node)

    case "number":
    case "single_quote_string":
    case "string":
    case "bool":
    case "null":
      return () => node.value

    case "column_ref":
      return column_ref(node)

    case "expr_list":
      return expr_list(node)

    default:
      log.debug("Unsupported node ", node)
      return always
  }
}

function column_ref(node) {
  return (row, tableName) => {
    console.log({node, row})

    if (node.table && node.table != tableName) return undefined

    return row[node.column]
  }
}

function expr_list(node) {
  const items = node.value.map((v) => expr(v))

  return (row) => {
    return items.map((i) => i(row))
  }
}

function binary_expr(node) {
  const left = expr(node.left)
  const right = expr(node.right)

  return (row) => {
    const leftValue = left(row)
    const rightValue = right(row)

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

    // by default always affects
    log.debug("Unsupported node ", node)
    return true
  }
}

function like(leftValue, rightValue) {
  // TODO implement
  return true
}

const always = () => true
