import {LiveQuery} from "../src"

describe("simple", () => {
  it("track all records from table", async () => {
    const liveQuery = new LiveQuery(async (_, ctx) => ctx.sql`
      select * from Test
    `.all())
  })
})