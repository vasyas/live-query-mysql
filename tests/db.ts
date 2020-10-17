import { DbConfig } from "binlog-triggers-mysql"
import * as mysql from "mysql"

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