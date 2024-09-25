import { Commit, DocumentLog } from '../../browser'
import { database } from '../../client'
import { Result, Transaction } from '../../lib'
import { documentLogs } from '../../schema'

export type CreateDocumentLogProps = {
  commit: Commit
  data: {
    uuid: string
    documentUuid: string
    parameters: Record<string, unknown>
    resolvedContent: string
    customIdentifier?: string
    duration: number
    createdAt?: Date
  }
}

export async function createDocumentLog(
  {
    data: {
      uuid,
      documentUuid,
      resolvedContent,
      parameters,
      customIdentifier,
      duration,
      createdAt,
    },
    commit,
  }: CreateDocumentLogProps,
  db = database,
) {
  return Transaction.call<DocumentLog>(async (trx) => {
    const inserts = await trx
      .insert(documentLogs)
      .values({
        uuid,
        documentUuid,
        commitId: commit.id,
        resolvedContent,
        parameters,
        customIdentifier,
        duration,
        createdAt,
      })
      .returning()

    const documentLog = inserts[0]!

    return Result.ok(documentLog)
  }, db)
}
