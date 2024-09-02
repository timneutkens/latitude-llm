'use server'

import { ProjectsRepository } from '@latitude-data/core/repositories'
import { destroyProject } from '@latitude-data/core/services/projects/destroy'
import { z } from 'zod'

import { authProcedure } from '../procedures'

export const destroyProjectAction = authProcedure
  .createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, ctx }) => {
    const scope = new ProjectsRepository(ctx.workspace.id)
    const project = await scope.find(Number(input.id)).then((r) => r.unwrap())
    const result = await destroyProject({ project })

    return result.unwrap()
  })
