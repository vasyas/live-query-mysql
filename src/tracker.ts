import {BinlogEvent, BinlogTriggers} from "binlog-triggers-mysql"
import {ensureArray} from "binlog-triggers-mysql/dist/utils"
import {From, Parser, Select} from "node-sql-parser"
import {LiveQuery} from "./LiveQuery"

export function enableLiveQueries(binlogTriggers: BinlogTriggers) {
  binlogTriggers.allTables((rows, prevRows, event) => {
    const queries = getAffectedQueries(event)

    queries.forEach((q) => {
      q.trigger()
    })
  })
}

export function resetLiveQueriesTracks() {
  for (const key of Object.keys(liveQueriesPerTable)) {
    delete liveQueriesPerTable[key]
  }
}

// for now, just trigger all queries that read from affected tables
const liveQueriesPerTable: {[tableName: string]: LiveQuery<never, never>[]} = {}

export function trackData(track: DataTrack, liveQuery) {
  for (const tableTrack of track) {
    trackTable(tableTrack.name, liveQuery)
  }
}

export function untrackData(track: DataTrack, liveQuery) {
  for (const tableTrack of track) {
    untrackTable(tableTrack.name, liveQuery)
  }
}

function trackTable(tableName, liveQuery) {
  const t = liveQueriesPerTable[tableName] || []
  t.push(liveQuery)
  liveQueriesPerTable[tableName] = t
}

function untrackTable(tableName, liveQuery) {
  const t = liveQueriesPerTable[tableName]
  if (!t) return

  const index = t.indexOf(liveQuery)
  if (index > -1) {
    t.splice(index, 1)
  }

  if (!t.length) delete liveQueriesPerTable[tableName]
}

function getAffectedQueries(event: BinlogEvent): LiveQuery<never, never>[] {
  return liveQueriesPerTable[event.tableName] || []
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
      })
    }
  }

  return r
}

export type DataTrack = TableTrack[]
export type TableTrack = {
  name: string
}
