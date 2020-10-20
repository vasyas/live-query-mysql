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

  it("single field constant op", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) => ctx.sql("select * from Test where 2 < id"))

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(1, testData.length)

    // this should be caught
    await sql("insert into Test(id) values(3)")
    await adelay(10)
    assert.equal(2, testData.length)
  })

  it("single field constant logic", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) =>
      ctx.sql("select * from Test where id > 2 and id < 4")
    )

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(1, testData.length)

    // this should be caught
    await sql("insert into Test(id) values(3)")
    await adelay(10)
    assert.equal(2, testData.length)

    // this is not
    await sql("insert into Test(id) values(4)")
    await adelay(10)
    assert.equal(2, testData.length)
  })

  it("single field constant logic order", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) =>
      ctx.sql("select * from Test where id = 2 or id = 3")
    )

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(2, testData.length)

    // this should be caught
    await sql("insert into Test(id) values(3)")
    await adelay(10)
    assert.equal(3, testData.length)

    // this is not
    await sql("insert into Test(id) values(4)")
    await adelay(10)
    assert.equal(3, testData.length)
  })

  it("parenthes", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) =>
      ctx.sql("select * from Test where id = (4 / 4 + 1)")
    )

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(2, testData.length)

    await sql("insert into Test(id) values(3)")
    await adelay(10)
    assert.equal(2, testData.length)
  })

  it("in", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) =>
      ctx.sql("select * from Test where id in (2, 3)")
    )

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(2, testData.length)

    await sql("insert into Test(id) values(3)")
    await adelay(10)
    assert.equal(3, testData.length)

    await sql("insert into Test(id) values(4)")
    await adelay(10)
    assert.equal(3, testData.length)
  })

  // operators: like
  // page (limit, offset)

  // only certain fields
  // functions: lower etc

  // inner joins
  // operators with json

  // groups?
})
