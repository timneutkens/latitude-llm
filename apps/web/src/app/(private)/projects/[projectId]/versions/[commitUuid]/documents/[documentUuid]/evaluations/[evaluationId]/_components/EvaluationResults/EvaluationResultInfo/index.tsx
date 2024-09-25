import { useCallback, useRef, useState } from 'react'

import { EvaluationDto, ProviderLogDto } from '@latitude-data/core/browser'
import { DocumentLogWithMetadata, EvaluationResultWithMetadata } from '@latitude-data/core/repositories'
import { Button, Icon, Modal, ReactStateDispatch, TabSelector, useToast } from '@latitude-data/web-ui'

import { EvaluationResultMessages } from './Messages'
import { EvaluationResultMetadata } from './Metadata'
import useProviderLogs from '$/stores/providerLogs'
import { DocumentLogInfo } from '../../../../../logs/_components/DocumentLogs/DocumentLogInfo'

type MaybeDocumentLog = DocumentLogWithMetadata | null | undefined
export default function DocumentLogInfoModal({
  documentLog,
  onOpenChange,
}: {
  documentLog: DocumentLogWithMetadata
  onOpenChange: ReactStateDispatch<MaybeDocumentLog>
}) {
  const { data: providerLogs } = useProviderLogs({
    documentLogUuid: documentLog?.uuid,
  })
  return (
    <Modal
      defaultOpen
      onOpenChange={() => onOpenChange(null)}
      title='Document Log Info'
      description='Detais of original document log'
    >
      <DocumentLogInfo documentLog={documentLog} providerLogs={providerLogs} />
    </Modal>
  )
}

function useFetchDocumentLog({ documentLogId}: { documentLogId: number }) {
  const { toast } = useToast()
  const documentLog = useRef<MaybeDocumentLog>(null)
  const [fetching, setFetching] = useState(false)
  const fetchDocumentLog = useCallback(async () => {
    if (documentLog.current) return documentLog.current

    setFetching(true)

    try {
      const response = await fetch(
        `/api/documentLogs/${documentLogId}`,
        { credentials: 'include' },
      )
      documentLog.current = await response.json()
    } catch (err) {
      const error = err as Error
      toast({
        title: 'Failed to fetch document log',
        description: error.message,
        variant: 'destructive',
      })
    }

    setFetching(false)
  }, [documentLogId])

  return { fetching, fetchDocumentLog }
}

export function EvaluationResultInfo({
  evaluation,
  evaluationResult,
  providerLog,
}: {
  evaluation: EvaluationDto
  evaluationResult: EvaluationResultWithMetadata
  providerLog?: ProviderLogDto
}) {
  const { fetching, fetchDocumentLog } = useFetchDocumentLog({
    documentLogId: evaluationResult.documentLogId
  })
  const [selectedTab, setSelectedTab] = useState<string>('metadata')
  const [selected, setSelected] = useState<MaybeDocumentLog>(null)
  const onClickOpen = useCallback(async () => {
    const documentLog = await fetchDocumentLog()

    setSelected(documentLog)
  }, [evaluationResult.documentLogId, fetchDocumentLog])
  return (
    <>
    <div className='w-80 flex-shrink-0 flex flex-col border border-border rounded-lg px-4 pt-6 items-center'>
      <TabSelector
        options={[
          { label: 'Metadata', value: 'metadata' },
          { label: 'Messages', value: 'messages' },
        ]}
        selected={selectedTab}
        onSelect={setSelectedTab}
      />
      <div className='flex flex-col relative w-full h-full max-h-full max-w-full overflow-auto'>
        {selectedTab === 'metadata' && (
          <EvaluationResultMetadata
            evaluation={evaluation}
            evaluationResult={evaluationResult}
            providerLog={providerLog}
          />
        )}
        {selectedTab === 'messages' && (
          <EvaluationResultMessages providerLog={providerLog} />
        )}
        <Button variant='link' onClick={onClickOpen}>
          {fetching ? 'Loading...' : 'Check original log metadata'}
          <Icon name='arrowRight' widthClass='w-4' heightClass='h-4' />
        </Button>
      </div>
    </div>
      {selected ? (
        <DocumentLogInfoModal documentLog={selected} onOpenChange={setSelected} />
      ) : null}
    </>
  )
}
