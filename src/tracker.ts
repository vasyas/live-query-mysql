import {BinlogEvent, BinlogTriggers} from "binlog-triggers-mysql"
import {Parser} from "node-sql-parser"
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
  for (const tableName of track) {
    trackTable(tableName, liveQuery)
  }
}

export function untrackData(track: DataTrack, liveQuery) {
  for (const tableName of track) {
    untrackTable(tableName, liveQuery)
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
  const tables = getQueryTables(query)
  return tables
}

function getQueryTables(query: string): string[] {
  const parser = new Parser()
  const tableList = parser.tableList(query)
  return tableList.map((t) => t.split("::")[2])
}

export type DataTrack = string[]
