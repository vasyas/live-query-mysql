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
  await sql("drop table if exists TestSub")
  await sql("create table Test (id int(11) primary key auto_increment)")
  await sql("create table TestSub (id int(11) primary key auto_increment, testId int(11))")
}

let triggers: BinlogTriggers

before(async () => {
  await initDatabase()

  triggers = new BinlogTriggers()
  enableLiveQueries(triggers)

  triggers.start(dbConfig)
})

beforeEach(async () => {
  await sql("delete from Test")
  await sql("delete from TestSub")
})

after(() => {
  setTimeout(() => {
    process.exit(0)
  }, 20)
})

export type Context = {sql: Sql}

setTrackingContextWrapper((ctx: Context, saveTrack) => {
  return {
    ...ctx,
    sql: (query, params) => {
      const results = ctx.sql.call(null, query, params)

      const track = getQueryDataTrack(query, params)
      saveTrack(track)

      return results
    },
  }
})

export async function adelay(ms) {
  await new Promise((r) => setTimeout(r, ms))
}
