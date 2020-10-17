import { DbConfig } from "binlog-triggers-mysql"
import {SqlBuilder} from "interpolated-sql"
import * as mysql from "mysql"
import {setTrackingContextWrapper} from "../src/LiveQuery"
import {getQueryDataTrack} from "../src/tracker"

const dbConfig: DbConfig = {
  database: "binlog_demo",
  host: "localhost",
  password: "test",
  user: "test",
  port: 3306,
}

function sql(s: string): Promise<void> {
  const connection = mysql.createConnection(dbConfig)
  connection.connect()

  return new Promise((resolve, reject) => {
    connection.query(s, (error, results, fields) => {
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

async function initDatabase() {
  await sql("drop table if exists Test")
  await sql("create table Test (id int(11) primary key auto_increment)")
}

before(async () => {
  await initDatabase()
})

beforeEach(async () => {
  await sql("delete from Test")
})

setTrackingContextWrapper((ctx: {sql}, saveTrack) => {
  return {
    ...ctx,
    sql: sqlBuilderWithTableTracking(ctx.sql, saveTrack),
  }
})

function sqlBuilderWithTableTracking(createSql: SqlBuilder, saveTrack): SqlBuilder {
  return (...params) => {
    const sql = createSql.apply(null, params)
    const oldConnectionSupplier = sql.connectionSupplier

    sql.connectionSupplier = async () => {
      const connection = await oldConnectionSupplier()

      const oldExecute = connection.execute
      connection.execute = (query, params) => {
        const track = getQueryDataTrack(query, params)
        saveTrack(track)

        return oldExecute.call(connection, query, params)
      }

      return connection
    }

    return sql
  }
}
