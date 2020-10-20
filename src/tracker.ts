import {BinlogEvent, BinlogTriggers, Row} from "binlog-triggers-mysql"
import {ensureArray} from "binlog-triggers-mysql/dist/utils"
import {From, Parser} from "node-sql-parser"
import {LiveQuery} from "./LiveQuery"
import {createTrackAffects, TrackExpression} from "./trackExpression"

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
  const allRows = [...rows, ...(prevRows || [])]

  const tableTracks = perTableTracks[event.tableName] || []
  return tableTracks
    .filter((t) => allRows.some((row) => t.affects(row, event.tableName)))
    .map((t) => t.query)
}

export function getQueryDataTrack(query, params): DataTrack {
  const parser = new Parser()
  const asts = ensureArray(parser.astify(query))

  const r: DataTrack = []

  for (const ast of asts) {
    if (ast.type != "select") continue

    for (const from of ast.from) {
      if (from["type"] == "dual") continue

      r.push({
        name: (from as From).table,
        affects: createTrackAffects(ast.where),
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
