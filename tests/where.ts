import {assert} from "chai"
import {LiveQuery} from "../src/LiveQuery"
import {adelay, Context, sql} from "./db"
import {mockSession, testData} from "./mockSession"

describe("where track", () => {
  it("single field constant", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) => ctx.sql("select * from Test where id = 1"))

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(2, testData.length)

    // this one is ignored
    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(2, testData.length)
  })

  it("single field constant with pstmt", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) =>
      ctx.sql("select * from Test where id = ?", [1])
    )

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(2, testData.length)

    // this one is ignored
    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(2, testData.length)
  })

  // operators: like, in, gt, lt
  // combinators: and, or
  // page (limit, offset)

  // only certaint fields

  // functinos: lower etc

  // inner joins

  // operators with json

  // groups?
})
