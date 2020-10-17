import {DataSupplier, LocalTopicImpl} from "@push-rpc/core"
import {LocalTopicImplOpts} from "@push-rpc/core/dist/local"
import {BinlogEvent, BinlogTriggers} from "binlog-triggers-mysql"
import {SqlBuilder} from "interpolated-sql"
import {Parser} from "node-sql-parser"

/**
 * Queries should use the same tables in each invocation, otherwise tracking will fail
 */
export class LiveQuery<D, F, TD = D> extends LocalTopicImpl<D, F, TD> {
  constructor(supplier: DataSupplier<D, F>, opts?: Partial<LocalTopicImplOpts<D, F, TD>>) {
    super((f: F, ctx) => supplier(f, this.wrapContext(ctx)), opts)
  }

  private wrapContext(ctx) {
    if (this.trackedTables) return ctx

    // wrap sql to track affected tables
    return {
      ...ctx,
      sql: sqlBuilderWithTableTracking(ctx.sql, (tables) => {
        if (!this.trackedTables) this.trackedTables = []
        this.trackedTables.push(...tables)
      }),
    }
  }

  async subscribeSession(session, filter: F) {
    const subscribed = this.isSubscribed()

    await super.subscribeSession(session, filter)

    // already have trackedTables filled here

    if (!subscribed) {
      this.trackedTables.forEach((tableName) => {
        trackTable(tableName, this)
      })
    }
  }

  unsubscribeSession(session, filter: F) {
    super.unsubscribeSession(session, filter)

    if (!this.isSubscribed() && this.trackedTables) {
      this.trackedTables.forEach((tableName) => {
        untrackTable(tableName, this)
      })
    }
  }

  private trackedTables: string[]
}

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

/** wraps SqlBuilder with ability to track tables in SQL */
function sqlBuilderWithTableTracking(createSql: SqlBuilder, updateTables): SqlBuilder {
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
