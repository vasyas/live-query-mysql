import {BinlogEvent, BinlogTriggers} from "binlog-triggers-mysql"
import {SqlBuilder} from "interpolated-sql"
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

// for now, just trigger all queries that read from affected tables

const liveQueriesPerTable: {[tableName: string]: LiveQuery<never, never>[]} = {}

export function trackTable(tableName, liveQuery) {
  const t = liveQueriesPerTable[tableName] || []
  t.push(liveQuery)
  liveQueriesPerTable[tableName] = t
}

export function untrackTable(tableName, liveQuery) {
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

/** wraps SqlBuilder with ability to track tables in SQL */
export function sqlBuilderWithTableTracking(createSql: SqlBuilder, updateTables): SqlBuilder {
  return (...params) => {
    const sql = createSql.apply(null, params)
    const oldConnectionSupplier = sql.connectionSupplier

    sql.connectionSupplier = async () => {
      const connection = await oldConnectionSupplier()

      const oldExecute = connection.execute
      connection.execute = (query, params) => {
        const tables = getQueryTables(query)
        updateTables(tables)

        return oldExecute.call(connection, query, params)
      }

      return connection
    }

    return sql
  }
}

function getQueryTables(query: string): string[] {
  const parser = new Parser()
  const tableList = parser.tableList(query)
  return tableList.map((t) => t.split("::")[2])
}
