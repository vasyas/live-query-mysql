Automatically re-run MySQL queries when underlying data changes.

Listens to MySQL binlog.
Best use with https://github.com/vasyas/push-rpc .

## Example

```
  const users = new LiveQuery(
    (_, ctx: DatabaseContext): Promise<User[]> => {
      return ctx.sql`
        select *
        from User
      `.all()
    }
  )

  ...

  users.subscribe(users => {
    console.log("New users", users);
  });
```

For more details, see tests.

## Integrating with other libraries
## Video 

