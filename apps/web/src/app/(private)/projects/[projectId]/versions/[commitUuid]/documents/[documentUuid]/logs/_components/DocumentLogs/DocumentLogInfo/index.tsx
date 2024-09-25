'use client'

import { useState } from 'react'

import { ProviderLogDto } from '@latitude-data/core/browser'
import { DocumentLogWithMetadata } from '@latitude-data/core/repositories'
import { TabSelector } from '@latitude-data/web-ui'

import { DocumentLogMessages } from './Messages'
import { DocumentLogMetadata } from './Metadata'

export function DocumentLogInfo({
  documentLog,
  providerLogs,
}: {
  documentLog: DocumentLogWithMetadata
  providerLogs?: ProviderLogDto[]
}) {
  const [selectedTab, setSelectedTab] = useState<string>('metadata')
  return (
    <>
      <TabSelector
        options={[
          { label: 'Metadata', value: 'metadata' },
          { label: 'Messages', value: 'messages' },
        ]}
        selected={selectedTab}
        onSelect={setSelectedTab}
      />
      <div className='flex relative w-full h-full max-h-full max-w-full overflow-auto'>
        {selectedTab === 'metadata' && (
          <DocumentLogMetadata
            documentLog={documentLog}
            providerLogs={providerLogs}
          />
        )}
        {selectedTab === 'messages' && (
          <DocumentLogMessages providerLogs={providerLogs} />
        )}
      </div>
    </>
  )
}
