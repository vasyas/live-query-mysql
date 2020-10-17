import {DataSupplier, LocalTopicImpl} from "@push-rpc/core"
import {LocalTopicImplOpts} from "@push-rpc/core/dist/local"
import {SqlBuilder} from "interpolated-sql"
import {DataTrack, getQueryDataTrack, trackData, untrackData} from "./tracker"

/**
 * Queries should use the same tables in each invocation, otherwise tracking will fail
 */
export class LiveQuery<D, F, TD = D> extends LocalTopicImpl<D, F, TD> {
  constructor(supplier: DataSupplier<D, F>, opts?: Partial<LocalTopicImplOpts<D, F, TD>>) {
    super((f: F, ctx) => supplier(f, this.wrapContext(ctx)), opts)
  }

  private wrapContext(ctx) {
    if (this.track) return ctx

    // wrap sql to track affected tables
    return {
      ...ctx,
      sql: sqlBuilderWithTableTracking(ctx.sql, (tables) => {
        if (!this.track) this.track = []
        this.track.push(...tables)
      }),
    }
  }

  async subscribeSession(session, filter: F) {
    const subscribed = this.isSubscribed()

    await super.subscribeSession(session, filter)

    // already have track filled here, b/c initial data is sent

    if (!subscribed) {
      trackData(this.track, this)
    }
  }

  unsubscribeSession(session, filter: F) {
    super.unsubscribeSession(session, filter)

    // no longer subscribed and at least one query complete
    if (!this.isSubscribed() && this.track) {
      untrackData(this.track, this)
    }
  }

  private track: DataTrack
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
        const tables = getQueryDataTrack(query, params)
        updateTables(tables)

        return oldExecute.call(connection, query, params)
      }

      return connection
    }

    return sql
  }
}
