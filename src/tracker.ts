import {BinlogEvent, BinlogTriggers, Row} from "binlog-triggers-mysql"
import {ensureArray} from "binlog-triggers-mysql/dist/utils"
import {From, Parser} from "node-sql-parser"
import {LiveQuery} from "./LiveQuery"
import {createTrackAffects, TrackExpression, wrapPlaceholders} from "./trackExpression"
import {lowerCaseTableName} from "./options"

export function enableLiveQueries(binlogTriggers: BinlogTriggers) {
  binlogTriggers.allTables((rows, prevRows, event) => {
    const queries = getAffectedQueries(event, rows, prevRows)

    queries.forEach((q) => {
      q.trigger()
    })
  })
}

// for tests
export function resetLiveQueriesTracks() {
  for (const key of Object.keys(perTableTracks)) {
    delete perTableTracks[key]
  }
}

const perTableTracks: {
  [tableName: string]: {query: LiveQuery<unknown, unknown>; affects: TrackExpression}[]
} = {}

export function trackData(track: DataTrack, query: LiveQuery<unknown, unknown>) {
  for (const tableTrack of track) {
    const t = perTableTracks[tableTrack.name] || []
    perTableTracks[tableTrack.name] = t

    t.push({
      query,
      affects: tableTrack.affects,
    })
  }
}

export function untrackData(track: DataTrack, liveQuery) {
  for (const tableTrack of track) {
    const t = perTableTracks[tableTrack.name]
    if (!t) return

    const index = t.findIndex((t) => t.query == liveQuery)
    if (index > -1) {
      t.splice(index, 1)
    }

    if (!t.length) delete perTableTracks[tableTrack.name]
  }
}

function getAffectedQueries(
  event: BinlogEvent,
  rows: Row[],
  prevRows: Row[]
): LiveQuery<unknown, unknown>[] {
  const tableName = lowerCaseTableName(event.tableName)

  const allRows = [...rows, ...(prevRows || [])]

  const tableTracks = perTableTracks[tableName] || []
  const queries = tableTracks
    .filter((t) => allRows.some((row) => t.affects(row, tableName)))
    .map((t) => t.query)

  return [...new Set(queries)]
}

export function getQueryDataTrack(query, params): DataTrack {
  const parser = new Parser()

  const wrappedQuery = wrapPlaceholders(query)
  const asts = ensureArray(parser.astify(wrappedQuery))

  const r: DataTrack = []

  for (const ast of asts) {
    if (ast.type != "select") continue

    const tableMap = ast.from.reduce((r, from: From) => {
      r[from.as] = lowerCaseTableName(from.table)
      r[from.table] = lowerCaseTableName(from.table)
      return r
    }, {})

    for (const from of ast.from) {
      if (from["type"] == "dual") continue

      if (!from.table) continue

      r.push({
        name: lowerCaseTableName((from as From).table),
        affects: createTrackAffects(ast.where, tableMap, params),
      })
    }
  }

  return r
}

export type DataTrack = TableTrack[]
export type TableTrack = {
  name: string
  affects: TrackExpression
}
