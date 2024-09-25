import { describe, expect, it, vi } from 'vitest'

import { DocumentLog } from '../../browser'
import { Providers } from '../../constants'
import { connectEvaluations } from '../evaluations'
import { computeWorkspaceUsage, getLatestRenewalDate } from './usage'

describe('computeWorkspaceUsage', () => {
  it('calculates usage correctly when there are evaluation results and document logs', async (ctx) => {
    const { workspace, commit, documents, evaluations } =
      await ctx.factories.createProject({
        providers: [{ type: Providers.OpenAI, name: 'test' }],
        documents: {
          foo: ctx.factories.helpers.createPrompt({ provider: 'test' }),
        },
        evaluations: [
          { prompt: ctx.factories.helpers.createPrompt({ provider: 'test' }) },
        ],
      })

    const NUM_DOC_LOGS = 5
    const NUM_EVAL_LOGS = 5

    const document = documents[0]!
    const evaluation = evaluations[0]!
    await connectEvaluations({
      workspace,
      documentUuid: document.documentUuid,
      evaluationUuids: [evaluation.uuid],
    })

    // Create document logs
    const documentLogs: DocumentLog[] = await Promise.all(
      Array(NUM_DOC_LOGS)
        .fill(null)
        .map(() =>
          ctx.factories
            .createDocumentLog({
              document,
              commit,
            })
            .then((r) => r.documentLog),
        ),
    )

    const evaluationLogs = await Promise.all(
      Array(NUM_EVAL_LOGS)
        .fill(null)
        .map((_, idx) =>
          ctx.factories
            .createEvaluationResult({
              documentLog: documentLogs[idx % documentLogs.length]!,
              evaluation,
            })
            .then((r) => r.evaluationResult),
        ),
    )

    const result = await computeWorkspaceUsage(workspace).then((r) =>
      r.unwrap(),
    )

    expect(result.usage).toBe(documentLogs.length + evaluationLogs.length)
  })

  it('calculates usage correctly when there are no evaluation results or document logs', async (ctx) => {
    const { workspace, documents, evaluations } =
      await ctx.factories.createProject({
        providers: [{ type: Providers.OpenAI, name: 'test' }],
        documents: {
          foo: ctx.factories.helpers.createPrompt({ provider: 'test' }),
        },
        evaluations: [
          { prompt: ctx.factories.helpers.createPrompt({ provider: 'test' }) },
        ],
      })

    const document = documents[0]!
    const evaluation = evaluations[0]!
    await connectEvaluations({
      workspace,
      documentUuid: document.documentUuid,
      evaluationUuids: [evaluation.uuid],
    })

    const result = await computeWorkspaceUsage(workspace).then((r) =>
      r.unwrap(),
    )

    expect(result.usage).toBe(0)
  })

  it('calculates usage correctly across multiple projects within the workspace', async (ctx) => {
    const {
      workspace,
      commit: commit1,
      documents: documents1,
      evaluations,
    } = await ctx.factories.createProject({
      providers: [{ type: Providers.OpenAI, name: 'test' }],
      documents: {
        foo: ctx.factories.helpers.createPrompt({ provider: 'test' }),
      },
      evaluations: [
        { prompt: ctx.factories.helpers.createPrompt({ provider: 'test' }) },
      ],
    })

    const { commit: commit2, documents: documents2 } =
      await ctx.factories.createProject({
        workspace,
        documents: {
          bar: ctx.factories.helpers.createPrompt({ provider: 'test' }),
        },
      })

    const NUM_DOC_LOGS_PER_PROJECT = 5
    const NUM_EVAL_LOGS_PER_PROJECT = 5

    const evaluation = evaluations[0]!
    const document1 = documents1[0]!
    const document2 = documents2[0]!

    await connectEvaluations({
      workspace,
      documentUuid: document1.documentUuid,
      evaluationUuids: [evaluation.uuid],
    })

    await connectEvaluations({
      workspace,
      documentUuid: document2.documentUuid,
      evaluationUuids: [evaluation.uuid],
    })

    const document1Logs: DocumentLog[] = await Promise.all(
      Array(NUM_DOC_LOGS_PER_PROJECT)
        .fill(null)
        .map(() =>
          ctx.factories
            .createDocumentLog({
              document: document1,
              commit: commit1,
            })
            .then((r) => r.documentLog),
        ),
    )

    const document2Logs: DocumentLog[] = await Promise.all(
      Array(NUM_DOC_LOGS_PER_PROJECT)
        .fill(null)
        .map(() =>
          ctx.factories
            .createDocumentLog({
              document: document2,
              commit: commit2,
            })
            .then((r) => r.documentLog),
        ),
    )

    const evaluation1Logs = await Promise.all(
      Array(NUM_EVAL_LOGS_PER_PROJECT)
        .fill(null)
        .map((_, idx) =>
          ctx.factories
            .createEvaluationResult({
              documentLog: document1Logs[idx % document1Logs.length]!,
              evaluation,
            })
            .then((r) => r.evaluationResult),
        ),
    )

    const evaluation2Logs = await Promise.all(
      Array(NUM_EVAL_LOGS_PER_PROJECT)
        .fill(null)
        .map((_, idx) =>
          ctx.factories
            .createEvaluationResult({
              documentLog: document2Logs[idx % document2Logs.length]!,
              evaluation,
            })
            .then((r) => r.evaluationResult),
        ),
    )

    const documentLogs = [...document1Logs, ...document2Logs]
    const evaluationLogs = [...evaluation1Logs, ...evaluation2Logs]

    const result = await computeWorkspaceUsage(workspace).then((r) =>
      r.unwrap(),
    )

    expect(result.usage).toBe(documentLogs.length + evaluationLogs.length)
  })

  it('only takes into account the runs since the last renewal', async (ctx) => {
    const today = new Date(2024, 9, 12)
    const createdAt = new Date(2023, 6, 3)
    vi.spyOn(Date, 'now').mockImplementation(() => today.getTime())

    const { workspace, commit, documents } = await ctx.factories.createProject({
      providers: [{ type: Providers.OpenAI, name: 'test' }],
      documents: {
        foo: ctx.factories.helpers.createPrompt({ provider: 'test' }),
      },
      workspace: {
        createdAt,
      },
    })

    expect(workspace.createdAt).toEqual(createdAt)
    const document = documents[0]!

    const NUM_NOT_INCLUDED_DOC_LOGS = 5
    const NUM_INCLUDED_DOC_LOGS = 5

    // Workspace was created on 2023-06-03
    // Today is 2024-09-12, which means the last monthly renewal should be on 2024-09-12
    const expectedLastRenewalDate = new Date(2024, 9, 12)

    await Promise.all(
      Array(NUM_NOT_INCLUDED_DOC_LOGS)
        .fill(null)
        .map((idx) => {
          const dateBeforeLastRenewal = new Date(
            createdAt.getTime() +
              (expectedLastRenewalDate.getTime() - createdAt.getTime()) *
                (idx / (NUM_NOT_INCLUDED_DOC_LOGS - 1)),
          )
          return ctx.factories.createDocumentLog({
            document,
            commit,
            createdAt: dateBeforeLastRenewal,
          })
        }),
    )

    await Promise.all(
      Array(NUM_INCLUDED_DOC_LOGS)
        .fill(null)
        .map((idx) => {
          const dateAfterLastRenewal = new Date(
            expectedLastRenewalDate.getTime() +
              (today.getTime() - expectedLastRenewalDate.getTime()) *
                (idx / (NUM_INCLUDED_DOC_LOGS - 1)),
          )
          return ctx.factories.createDocumentLog({
            document,
            commit,
            createdAt: dateAfterLastRenewal,
          })
        }),
    )

    const result = await computeWorkspaceUsage(workspace).then((r) =>
      r.unwrap(),
    )

    expect(result.usage).toBe(NUM_INCLUDED_DOC_LOGS)
  })
})

describe('getLatestRenewalDate', () => {
  it('returns the first renewal date if the target date is before the first renewal date', () => {
    const firstRenewalDate = new Date(2000, 9, 12)
    const targetDate = new Date(1980, 1, 1)

    const result = getLatestRenewalDate(firstRenewalDate, targetDate)

    expect(result).toEqual(firstRenewalDate)
  })

  it('returns the original date if a month has not yet passed', () => {
    const firstRenewalDate = new Date(2024, 9, 12)
    const targetDate = new Date(2024, 9, 15)

    const result = getLatestRenewalDate(firstRenewalDate, targetDate)

    expect(result).toEqual(firstRenewalDate)
  })

  it('returns the same month as the target when the target day number is greater', () => {
    const firstRenewalDate = new Date(2000, 2, 12)
    const targetDate = new Date(2024, 5, 15)

    const result = getLatestRenewalDate(firstRenewalDate, targetDate)

    expect(result).toEqual(new Date(2024, 5, 12))
  })

  it('returns the previous month as the target when the target day number is lesser', () => {
    const firstRenewalDate = new Date(2000, 2, 12)
    const targetDate = new Date(2024, 5, 10)

    const result = getLatestRenewalDate(firstRenewalDate, targetDate)

    expect(result).toEqual(new Date(2024, 4, 12))
  })

  it('returns the same date as the target when the target day number is equal', () => {
    const firstRenewalDate = new Date(2000, 2, 12)
    const targetDate = new Date(2024, 5, 12)

    const result = getLatestRenewalDate(firstRenewalDate, targetDate)

    expect(result).toEqual(new Date(2024, 5, 12))
  })

  it('returns the previous December when the target date is in January', () => {
    const firstRenewalDate = new Date(2000, 2, 12)
    const targetDate = new Date(2024, 0, 1) // 0 = January

    const result = getLatestRenewalDate(firstRenewalDate, targetDate)

    expect(result).toEqual(new Date(2023, 11, 12))
  })
})
