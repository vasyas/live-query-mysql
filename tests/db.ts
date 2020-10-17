import {BinlogTriggers, DbConfig} from "binlog-triggers-mysql"
import * as mysql from "mysql"
import {setTrackingContextWrapper} from "../src/LiveQuery"
import {enableLiveQueries, getQueryDataTrack} from "../src/tracker"

const dbConfig: DbConfig = {
  database: "binlog_demo",
  host: "localhost",
  password: "test",
  user: "test",
  port: 3306,
}

export function sql(query: string, params: unknown[] = []): Promise<void> {
  const connection = mysql.createConnection(dbConfig)
  connection.connect()

  return new Promise((resolve, reject) => {
    connection.query(query, (error, results, fields) => {
      if (error) reject(error)
      else resolve(results)

      try {
        connection.end()
      } catch (e) {
        console.log(e)
      }
    })
  })
}

type Sql = typeof sql

async function initDatabase() {
  await sql("drop table if exists Test")
  await sql("create table Test (id int(11) primary key auto_increment)")
}

before(async () => {
  await initDatabase()

  const triggers = new BinlogTriggers()
  enableLiveQueries(triggers)

  triggers.start(dbConfig)
})

beforeEach(async () => {
  await sql("delete from Test")
})

setTrackingContextWrapper((ctx: {sql: Sql}, saveTrack) => {
  return {
    ...ctx,
    sql: sqlWithTableTracking(ctx.sql, saveTrack),
  }
})

function sqlWithTableTracking(oldSql: Sql, saveTrack): Sql {
  return (query, params) => {
    const results = oldSql.call(null, query, params)

    const track = getQueryDataTrack(query, params)
    saveTrack(track)

    return results
  }
}
