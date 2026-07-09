Add a small clear button beside cross in ai chat box to clear user history.

When user clicks it , it will ask for a confirmation and then simply clear all the messages for that projectId and user (basically reset). So whatever stored in db should be cleared at once. if multiple users working on same project , it will delete only for the user who opted for it.

## Check When Done

- db chat history for that projectId and userId gets cleared once confirmed to delete.
- `npm run build` passes.