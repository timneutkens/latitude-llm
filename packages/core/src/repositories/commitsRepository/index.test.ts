import { beforeEach, describe, expect, it } from 'vitest'

import type { Project, ProviderApiKey, User } from '../../browser'
import { CommitStatus } from '../../constants'
import { mergeCommit } from '../../services/commits'
import { createNewDocument } from '../../services/documents'
import * as factories from '../../tests/factories'
import { CommitsRepository } from './index'

async function createDraftsCommits(
  project: Project,
  user: User,
  provider: ProviderApiKey,
) {
  const results = []
  for (let i = 0; i < 10; i++) {
    const draft = await factories.createDraft({ project, user })
    await createNewDocument({
      commit: draft.commit,
      path: `${i}/foo`,
      content: factories.helpers.createPrompt({ provider }),
    })
    results.push(draft)
  }
  return results
}

let project: Project
let repository: CommitsRepository
describe('Commits by project', () => {
  beforeEach(async () => {
    let {
      project: firstProject,
      user,
      providers,
    } = await factories.createProject()
    const drafsCommits = await createDraftsCommits(
      firstProject,
      user,
      providers[0]!,
    )
    await Promise.all([
      mergeCommit(drafsCommits[0]!.commit),
      mergeCommit(drafsCommits[1]!.commit),
    ])
    project = firstProject
    repository = new CommitsRepository(project.workspaceId)
  })

  it('gets all commits', async () => {
    const list = await repository
      .getCommitsByProject({ project })
      .then((r) => r.unwrap())
    expect(list).toHaveLength(11)
  })

  it('get merged commits', async () => {
    const list = await repository
      .getCommitsByProject({
        project,
        filterByStatus: CommitStatus.Merged,
      })
      .then((r) => r.unwrap())
    expect(list).toHaveLength(3)
  })

  it('get drafts commits', async () => {
    const list = await repository
      .getCommitsByProject({
        project,
        filterByStatus: CommitStatus.Draft,
      })
      .then((r) => r.unwrap())

    expect(list).toHaveLength(8)
  })

  it('get first page of drafts commits', async () => {
    const list = await repository
      .getCommitsByProject({
        project,
        filterByStatus: CommitStatus.Draft,
        page: 1,
        pageSize: 5,
      })
      .then((r) => r.unwrap())
    expect(list).toHaveLength(5)
  })
})
