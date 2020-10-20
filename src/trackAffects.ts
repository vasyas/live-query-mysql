import {Row} from "binlog-triggers-mysql"

export type TrackAffects = (row: Row) => boolean

export function createTrackAffects(astWhere): TrackAffects {
  if (!astWhere) return always

  console.log(astWhere)

  return always
}

const always = () => true
