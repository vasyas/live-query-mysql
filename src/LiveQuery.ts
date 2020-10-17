import {DataSupplier, LocalTopicImpl} from "@push-rpc/core"
import {LocalTopicImplOpts} from "@push-rpc/core/dist/local"
import {sqlBuilderWithTableTracking, trackTable, untrackTable} from "./tracker"

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