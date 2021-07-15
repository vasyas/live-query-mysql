import {DataSupplier, LocalTopicImpl} from "@push-rpc/core"
import {LocalTopicImplOpts} from "@push-rpc/core/dist/local"
import {DataTrack, trackData, untrackData} from "./tracker"

/**
 * Queries should use the same tables in each invocation, otherwise tracking will fail
 */
export class LiveQuery<D, F, TD = D> extends LocalTopicImpl<D, F, TD> {
  constructor(supplier: DataSupplier<D, F>, opts?: Partial<LocalTopicImplOpts<D, F, TD>>) {
    super((f: F, ctx) => supplier(f, this.wrapContextIfRequired(ctx)), opts)
  }

  private wrapContextIfRequired(ctx) {
    // do not wrap if already got tracks
    if (this.tracks) return ctx

    // wrap sql to track affected tables
    return trackingContextWrapper(ctx, (track) => {
      // skip dummy queries
      if (!track.length) return

      if (!this.tracks) this.tracks = []
      this.tracks.push(track)
    })
  }

  async subscribeSession(session, filter: F, messageId: any, ctx: any) {
    const subscribed = this.isSubscribed()

    const r = await super.subscribeSession(session, filter, messageId, ctx)

    // already have track filled here, b/c initial data is sent

    if (!subscribed) {
      for (const track of this.tracks) trackData(track, this)
    }

    return r
  }

  unsubscribeSession(session, filter: F) {
    super.unsubscribeSession(session, filter)

    // no longer subscribed and at least one query complete
    if (!this.isSubscribed() && this.tracks) {
      for (const track of this.tracks) untrackData(track, this)

      this.tracks = null
    }
  }

  // FIXME tracks should be parameter-specific. Otherwise, subscribing in a same session to a same LQ with different params will be ignored.
  private tracks: DataTrack[]
}

export type TrackingContextWrapper<T extends Record<string, unknown>> = (
  ctx: T,
  saveTrack: (t: DataTrack) => void
) => T

let trackingContextWrapper: TrackingContextWrapper<Record<string, unknown>> = () => {
  throw new Error("Provide trackingContextWrapper")
}

export function setTrackingContextWrapper<T extends Record<string, unknown>>(
  w: TrackingContextWrapper<T>
) {
  trackingContextWrapper = w
}
