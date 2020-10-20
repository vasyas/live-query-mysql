import {Row} from "binlog-triggers-mysql"

export type TrackAffects = (row: Row) => boolean

export function createTrackAffects(where): TrackAffects {
  if (!where) return always

  const impl = expr(where)

  return (row) => {
    try {
      return impl(row)
    } catch (e) {
      console.log(e)

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
      return () => node.value
    case "column_ref":
      return column_ref(node)
    default:
      return always
  }
}

function column_ref(node) {
  return (row) => {
    return row[node.column]
  }
}

function binary_expr(node) {
  const left = expr(node.left)
  const right = expr(node.right)

  return (row) => {
    const leftValue = left(row)
    const rightValue = right(row)

    if (node.operator == "=") return leftValue == rightValue

    // by default always affects
    return true
  }
}

const always = () => true
